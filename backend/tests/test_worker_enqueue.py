"""Tests for worker enqueue helper."""

from unittest.mock import MagicMock

from app.services.workers.enqueue import try_enqueue


def test_try_enqueue_returns_task_id():
    task = MagicMock()
    task.delay.return_value = MagicMock(id="task-123")
    assert try_enqueue(task, "a", "b") == "task-123"
    task.delay.assert_called_once_with("a", "b")


def test_try_enqueue_returns_none_on_broker_failure():
    task = MagicMock()
    task.delay.side_effect = ConnectionError("broker down")
    assert try_enqueue(task, "x") is None
