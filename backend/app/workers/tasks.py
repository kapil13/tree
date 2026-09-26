from __future__ import annotations

import uuid

from app.core.logging import get_logger
from app.workers.async_runner import run_async
from app.workers.celery_app import celery_app

log = get_logger("worker")


async def _record(job_name: str, status: str, result=None, error=None):
    from app.core.database import AsyncSessionLocal
    from app.services.monitoring.job_runs import record_job_run

    async with AsyncSessionLocal() as db:
        await record_job_run(db, job_name=job_name, status=status, result=result, error=error)


def _execute_recorded(job_name: str, work):
    """Run async job work and persist a monitoring job_run row in one event loop."""

    async def _wrapped():
        from app.services.monitoring.prometheus_metrics import observe_celery_job

        try:
            result = await work()
            await _record(job_name, "ok", result)
            observe_celery_job(job_name, "ok")
            return result
        except Exception as exc:
            await _record(job_name, "error", error=str(exc))
            observe_celery_job(job_name, "error")
            raise

    return run_async(_wrapped())


@celery_app.task(name="app.workers.tasks.run_bioacoustic_analysis")
def run_bioacoustic_analysis(recording_id: str) -> dict:
    log.info("worker.run_bioacoustic_analysis", recording_id=recording_id)
    from app.services.bioacoustic.ops import analyze_bioacoustic_recording_sync

    return analyze_bioacoustic_recording_sync(uuid.UUID(recording_id))


@celery_app.task(name="app.workers.tasks.run_ai_analysis")
def run_ai_analysis(tree_id: str, user_id: str, mode: str = "full") -> dict:
    log.info("worker.run_ai_analysis", tree_id=tree_id, user_id=user_id)

    async def _run() -> dict:
        from app.api.v1.analysis import _run_tree_analysis
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.schemas.analysis import AnalysisRequest

        async with AsyncSessionLocal() as db:
            user = await db.get(User, uuid.UUID(user_id))
            if user is None:
                return {"status": "user_not_found", "tree_id": tree_id}
            payload = AnalysisRequest(tree_id=uuid.UUID(tree_id), mode=mode)  # type: ignore[arg-type]
            try:
                rec = await _run_tree_analysis(payload, user, db)
            except Exception as exc:
                detail = getattr(exc, "detail", str(exc))
                return {"status": "failed", "tree_id": tree_id, "error": str(detail)}
            return {
                "status": "completed",
                "tree_id": tree_id,
                "analysis_id": str(rec.id),
            }

    return _execute_recorded("run_ai_analysis", _run)


@celery_app.task(name="app.workers.tasks.run_satellite_scan")
def run_satellite_scan(tree_id: str) -> dict:
    log.info("worker.run_satellite_scan", tree_id=tree_id)

    async def _run() -> dict:
        from sqlalchemy import select

        from app.core.database import AsyncSessionLocal
        from app.models.tree import Tree
        from app.services.monitoring.satellite_sweep import scan_and_persist_tree

        async with AsyncSessionLocal() as db:
            tree = (
                await db.execute(select(Tree).where(Tree.id == uuid.UUID(tree_id)))
            ).scalar_one_or_none()
            if tree is None:
                return {"status": "not_found", "tree_id": tree_id}
            rec = await scan_and_persist_tree(db, tree)
            await db.commit()
            return {
                "tree_id": tree_id,
                "status": "ok" if rec else "failed",
                "ndvi_mean": float(rec.ndvi_mean) if rec and rec.ndvi_mean else None,
            }

    return _execute_recorded("run_satellite_scan", _run)


@celery_app.task(name="app.workers.tasks.run_sar_scan")
def run_sar_scan(tree_id: str) -> dict:
    log.info("worker.run_sar_scan", tree_id=tree_id)

    async def _run() -> dict:
        from sqlalchemy import select

        from app.core.database import AsyncSessionLocal
        from app.models.tree import Tree
        from app.services.monitoring.sar_sweep import scan_and_persist_tree_sar

        async with AsyncSessionLocal() as db:
            tree = (
                await db.execute(select(Tree).where(Tree.id == uuid.UUID(tree_id)))
            ).scalar_one_or_none()
            if tree is None:
                return {"status": "not_found", "tree_id": tree_id}
            result = await scan_and_persist_tree_sar(db, tree)
            await db.commit()
            if result is None:
                return {"status": "failed", "tree_id": tree_id}
            _rec, analysis = result
            return {
                "tree_id": tree_id,
                "status": "ok",
                "ground_status": analysis.ground_status,
                "risk_level": analysis.risk_level,
            }

    return _execute_recorded("run_sar_scan", _run)


@celery_app.task(name="app.workers.tasks.monthly_sar_sweep")
def monthly_sar_sweep(cursor: str | None = None, batch_size: int | None = None) -> dict:
    log.info("worker.monthly_sar_sweep", cursor=cursor, batch_size=batch_size)

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.sweep_jobs import run_sar_sweep_page

        async with AsyncSessionLocal() as db:
            result = await run_sar_sweep_page(
                db,
                cursor=cursor,
                batch_size=batch_size,
                job_name="monthly_sar_sweep",
            )
        next_cursor = result.get("next_cursor")
        if next_cursor:
            monthly_sar_sweep.delay(cursor=next_cursor, batch_size=batch_size)
            result["chained"] = True
        return result

    return _execute_recorded("monthly_sar_sweep", _run)


@celery_app.task(name="app.workers.tasks.weekly_sar_integrity_watch")
def weekly_sar_integrity_watch(cursor: str | None = None, batch_size: int | None = None) -> dict:
    log.info("worker.weekly_sar_integrity_watch", cursor=cursor, batch_size=batch_size)

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.sweep_jobs import run_weekly_sar_integrity_watch_page

        async with AsyncSessionLocal() as db:
            result = await run_weekly_sar_integrity_watch_page(
                db,
                cursor=cursor,
                batch_size=batch_size,
            )
        next_cursor = result.get("next_cursor")
        if next_cursor:
            weekly_sar_integrity_watch.delay(cursor=next_cursor, batch_size=batch_size)
            result["chained"] = True
        return result

    return _execute_recorded("weekly_sar_integrity_watch", _run)


@celery_app.task(name="app.workers.tasks.daily_sar_sweep_health")
def daily_sar_sweep_health() -> dict:
    log.info("worker.daily_sar_sweep_health")

    async def _run() -> dict:
        from sqlalchemy import select

        from app.core.database import AsyncSessionLocal
        from app.models.planting_project import PlantingProject
        from app.models.user import User
        from app.services.monitoring.sar_sweep_health import evaluate_recent_sar_jobs

        reviewed = 0
        async with AsyncSessionLocal() as db:
            owner_ids = {
                p.owner_user_id
                for p in (
                    await db.execute(
                        select(PlantingProject).where(
                            PlantingProject.status.in_(("active", "planning")),
                            PlantingProject.owner_user_id.isnot(None),
                        )
                    )
                ).scalars().all()
                if p.owner_user_id
            }
            for owner_id in owner_ids:
                user = await db.get(User, owner_id)
                if user is None:
                    continue
                await evaluate_recent_sar_jobs(db, user)
                reviewed += 1
            await db.commit()
        return {"owners_reviewed": reviewed}

    return _execute_recorded("daily_sar_sweep_health", _run)


@celery_app.task(name="app.workers.tasks.recalc_carbon")
def recalc_carbon(tree_id: str, user_id: str) -> dict:
    log.info("worker.recalc_carbon", tree_id=tree_id, user_id=user_id)

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.services.carbon.recalc_ops import recalculate_tree_carbon

        async with AsyncSessionLocal() as db:
            user = await db.get(User, uuid.UUID(user_id))
            if user is None:
                return {"status": "user_not_found", "tree_id": tree_id}
            try:
                result = await recalculate_tree_carbon(
                    db, tree_id=uuid.UUID(tree_id), user=user
                )
            except Exception as exc:
                detail = getattr(exc, "detail", str(exc))
                return {"status": "failed", "tree_id": tree_id, "error": str(detail)}
            return {
                "status": "completed",
                "tree_id": tree_id,
                "carbon_kg": result.carbon_kg,
            }

    return _execute_recorded("recalc_carbon", _run)


@celery_app.task(name="app.workers.tasks.send_notification")
def send_notification(
    user_id: str,
    channel: str,
    title: str,
    message: str,
    push_data: dict | None = None,
) -> dict:
    """Async dispatch for email/SMS/push (decoupled from request path)."""
    log.info("worker.send_notification", user_id=user_id, channel=channel)

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.services.alerts.service import dispatch_notification_channel_inline

        async with AsyncSessionLocal() as db:
            user = await db.get(User, uuid.UUID(user_id))
            if user is None:
                return {"status": "user_not_found"}
            result = await dispatch_notification_channel_inline(
                db,
                user,
                channel,
                title=title,
                message=message,
                push_data=push_data,
            )
            return {"status": "ok", "delivered": {channel: result}}

    return run_async(_run())


@celery_app.task(name="app.workers.tasks.monthly_satellite_sweep")
def monthly_satellite_sweep(cursor: str | None = None, batch_size: int | None = None) -> dict:
    log.info("worker.monthly_satellite_sweep", cursor=cursor, batch_size=batch_size)

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.sweep_jobs import run_satellite_sweep_page

        async with AsyncSessionLocal() as db:
            result = await run_satellite_sweep_page(
                db,
                cursor=cursor,
                batch_size=batch_size,
            )
        next_cursor = result.get("next_cursor")
        if next_cursor:
            monthly_satellite_sweep.delay(cursor=next_cursor, batch_size=batch_size)
            result["chained"] = True
        return result

    return _execute_recorded("monthly_satellite_sweep", _run)


@celery_app.task(name="app.workers.tasks.daily_health_roundup")
def daily_health_roundup() -> dict:
    log.info("worker.daily_health_roundup")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.compliance_escalation import (
            create_compliance_escalation_alerts,
        )
        from app.services.monitoring.health_roundup import run_daily_health_roundup

        async with AsyncSessionLocal() as db:
            health = await run_daily_health_roundup(db)
            compliance = await create_compliance_escalation_alerts(db)
            return {"health": health, "compliance": compliance}

    return _execute_recorded("daily_health_roundup", _run)


@celery_app.task(name="app.workers.tasks.survival_survey_reminders")
def survival_survey_reminders() -> dict:
    log.info("worker.survival_survey_reminders")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.planting_projects.survival_survey import create_survival_survey_alerts

        async with AsyncSessionLocal() as db:
            return await create_survival_survey_alerts(db)

    return _execute_recorded("survival_survey_reminders", _run)


@celery_app.task(name="app.workers.tasks.citizen_stewardship_reminders")
def citizen_stewardship_reminders() -> dict:
    log.info("worker.citizen_stewardship_reminders")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.citizen.stewardship_alerts import create_citizen_stewardship_alerts

        async with AsyncSessionLocal() as db:
            return await create_citizen_stewardship_alerts(db)

    return _execute_recorded("citizen_stewardship_reminders", _run)


@celery_app.task(name="app.workers.tasks.biodiversity_baseline")
def biodiversity_baseline() -> dict:
    log.info("worker.biodiversity_baseline")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.intelligence.biodiversity_baseline import run_biodiversity_baseline

        async with AsyncSessionLocal() as db:
            return await run_biodiversity_baseline(db)

    return _execute_recorded("biodiversity_baseline", _run)


@celery_app.task(name="app.workers.tasks.compliance_deadline_scan")
def compliance_deadline_scan() -> dict:
    log.info("worker.compliance_deadline_scan")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.compliance_deadline_alerts import (
            scan_compliance_deadline_alerts,
        )

        async with AsyncSessionLocal() as db:
            return await scan_compliance_deadline_alerts(db)

    return _execute_recorded("compliance_deadline_scan", _run)


@celery_app.task(name="app.workers.tasks.daily_satellite_health_digest")
def daily_satellite_health_digest() -> dict:
    log.info("worker.daily_satellite_health_digest")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.satellite_health_digest import (
            run_daily_satellite_health_digest,
        )

        async with AsyncSessionLocal() as db:
            return await run_daily_satellite_health_digest(db)

    return _execute_recorded("daily_satellite_health_digest", _run)


@celery_app.task(name="app.workers.tasks.threat_watch_scan")
def threat_watch_scan() -> dict:
    log.info("worker.threat_watch_scan")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.planting_projects.threat_alerts import create_threat_watch_alerts

        async with AsyncSessionLocal() as db:
            return await create_threat_watch_alerts(db)

    return _execute_recorded("threat_watch_scan", _run)


@celery_app.task(name="app.workers.tasks.deliver_webhook")
def deliver_webhook(delivery_id: str) -> dict:
    log.info("worker.deliver_webhook", delivery_id=delivery_id)

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.webhooks.dispatcher import deliver_webhook_once

        async with AsyncSessionLocal() as db:
            delivery = await deliver_webhook_once(db, uuid.UUID(delivery_id))
            await db.commit()
            return {
                "delivery_id": delivery_id,
                "status": delivery.status,
                "response_status": delivery.response_status,
            }

    try:
        return run_async(_run())
    except Exception as exc:
        log.exception("deliver_webhook_failed", delivery_id=delivery_id)
        return {"delivery_id": delivery_id, "status": "error", "error": str(exc)}


@celery_app.task(name="app.workers.tasks.publish_daily_audit_root")
def publish_daily_audit_root() -> dict:
    log.info("worker.publish_daily_audit_root")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.audit.chain import run_daily_audit_root_publish

        async with AsyncSessionLocal() as db:
            return await run_daily_audit_root_publish(db)

    return _execute_recorded("publish_daily_audit_root", _run)


@celery_app.task(name="app.workers.tasks.refresh_project_integrity_fusion")
def refresh_project_integrity_fusion(project_id: str) -> dict:
    log.info("worker.refresh_project_integrity_fusion", project_id=project_id)

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.integrity.project_refresh import refresh_project_integrity

        async with AsyncSessionLocal() as db:
            result = await refresh_project_integrity(db, uuid.UUID(project_id))
            await db.commit()
            return result

    return _execute_recorded("refresh_project_integrity_fusion", _run)


@celery_app.task(name="app.workers.tasks.daily_tree_scan_sweep")
def daily_tree_scan_sweep() -> dict:
    log.info("worker.daily_tree_scan_sweep")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.tree_tile_sweep import (
            register_due_trees_without_targets,
            run_tree_scan_sweep,
        )

        async with AsyncSessionLocal() as db:
            enrolled = await register_due_trees_without_targets(db, limit=300)
            result = await run_tree_scan_sweep(db)
            result["newly_enrolled"] = enrolled
            return result

    return _execute_recorded("daily_tree_scan_sweep", _run)


@celery_app.task(name="app.workers.tasks.daily_satellite_watch_sweep")
def daily_satellite_watch_sweep() -> dict:
    log.info("worker.daily_satellite_watch_sweep")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.watch_area_sweep import run_daily_satellite_watch_sweep

        async with AsyncSessionLocal() as db:
            return await run_daily_satellite_watch_sweep(db)

    return _execute_recorded("daily_satellite_watch_sweep", _run)


@celery_app.task(name="app.workers.tasks.weekly_tree_scan_target_backfill")
def weekly_tree_scan_target_backfill() -> dict:
    log.info("worker.weekly_tree_scan_target_backfill")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.scan_targets import backfill_tree_scan_targets

        async with AsyncSessionLocal() as db:
            return await backfill_tree_scan_targets(db, limit=2000)

    return _execute_recorded("weekly_tree_scan_target_backfill", _run)


@celery_app.task(name="app.workers.tasks.weekly_scan_cycle_digest")
def weekly_scan_cycle_digest() -> dict:
    log.info("worker.weekly_scan_cycle_digest")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.scan_cycle_digest import run_weekly_scan_cycle_digest

        async with AsyncSessionLocal() as db:
            return await run_weekly_scan_cycle_digest(db)

    return _execute_recorded("weekly_scan_cycle_digest", _run)


@celery_app.task(name="app.workers.tasks.backfill_integrity_fusion")
def backfill_integrity_fusion(
    project_id: str | None = None,
    limit_projects: int = 50,
    organization_id: str | None = None,
) -> dict:
    log.info(
        "worker.backfill_integrity_fusion",
        project_id=project_id,
        limit_projects=limit_projects,
        organization_id=organization_id,
    )

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.integrity.project_refresh import backfill_integrity_fusion as run_backfill

        async with AsyncSessionLocal() as db:
            project_ids = [uuid.UUID(project_id)] if project_id else None
            org_uuid = uuid.UUID(organization_id) if organization_id else None
            result = await run_backfill(
                db,
                project_ids=project_ids,
                limit_projects=limit_projects if project_ids is None else None,
                organization_id=org_uuid if project_ids is None else None,
            )
            await db.commit()
            return result

    return _execute_recorded("backfill_integrity_fusion", _run)
