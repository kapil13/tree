#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hiPath = join(root, "messages/hi.json");
const enPath = join(root, "messages/en.json");

const hi = JSON.parse(readFileSync(hiPath, "utf8"));
const en = JSON.parse(readFileSync(enPath, "utf8"));

function set(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] ?? {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const hiPatches = {
  "nav.reportsMenuToggle": "रोपण रिपोर्ट दिखाएँ",
  "reports.brsrTab": "बीआरएसआर (SEBI)",
  "reports.iso14064Tab": "आईएसओ 14064-2",
  "reports.formatZip": "सुनिश्चिता पैक (JSON + Excel)",
  "reports.tnfdTab": "टीएनएफडी (LEAP)",
  "reports.ghgTab": "जीएचजी भूमि क्षेत्र",
  "reports.darwinTab": "डार्विन कोर",
  "reports.ghgTitle": "जीएचजी प्रोटोकॉल भूमि क्षेत्र (2024)",
  "reports.darwinTitle": "डार्विन कोर संग्रह (GBIF)",
  "reports.goldStandardTab": "गोल्ड स्टैंडर्ड LUF",
  "reports.reddPlusTab": "REDD+",
  "reports.parisNdcTab": "पेरिस / NDC",
  "reports.parisNdcTitle": "पेरिस समझौता — NDC ट्रेसेबिलिटी",
  "reports.greenCreditTab": "ग्रीन क्रेडिट",
  "reports.greenCreditTitle": "पर्यावरण मंत्रालय ग्रीन क्रेडिट कार्यक्रम",
  "reports.etfHandoffTab": "ETF / BTR",
  "plantationReports.navLabel": "रोपण रिपोर्ट",
  "plantationReports.reportComplianceExports": "अनुपालन और फ्रेमवर्क निर्यात",
  "plantationReports.reportProjectWise": "परियोजना-वार रोपण",
  "plantationReports.reportFyWise": "वित्तीय वर्ष-वार रिपोर्ट",
  "plantationReports.reportReGeotag": "पुनः जियोटैग रिपोर्ट",
  "plantationReports.reportTotalRecords": "कुल रोपण रिकॉर्ड",
  "plantationReports.reportSpeciesWise": "प्रजाति-वार सारांश",
  "plantationReports.reportWorkArea": "कार्य क्षेत्र / साइट रिपोर्ट",
  "plantationReports.reportSurvivalMortality": "उत्तरजीविता और मृत्यु दर",
  "plantationReports.reportComplianceViolations": "अनुपालन उल्लंघन",
  "plantationReports.reportSatelliteHealth": "उपग्रह स्वास्थ्य रिपोर्ट",
  "plantationReports.reportSchemeKpi": "योजना KPI (CAMPA / NHAI)",
  "plantationReports.reportFieldTeam": "फील्ड टीम प्रदर्शन",
  "plantationReports.reportCarbonStock": "कार्बन स्टॉक रिपोर्ट",
  "plantationReports.reportPhotoEvidence": "फोटो प्रमाण पैक",
  "plantationReports.reportDistrictBlock": "जिला / ब्लॉक प्रशासन",
  "plantationReports.reportPendingRegistration": "लंबित पंजीकरण",
  "plantationReports.reportOutOfFence": "बाड़ के बाहर के पेड़",
  "plantationReports.reportProjectWiseDesc":
    "प्रत्येक रोपण परियोजना के लिए पंजीकृत पेड़, लक्ष्य, उत्तरजीविता अनुवर्ती और अनुपालन स्थिति।",
  "plantationReports.reportFyWiseDesc":
    "वित्तीय वर्ष के अनुसार परियोजनाओं और पेड़ संख्या का रोल-अप (परियोजना स्थान मेटाडेटा से)।",
  "plantationReports.reportReGeotagDesc":
    "प्रत्येक परियोजना के सर्वेक्षण अंतराल के आधार पर उत्तरजीविता सर्वेक्षण / GPS पुनः-सत्यापन के लिए अतिदेय पेड़।",
  "plantationReports.reportTotalRecordsDesc":
    "जियोटैग, स्वास्थ्य और कार्य-क्षेत्र संदर्भ के साथ संगठन-व्यापी पेड़ रजिस्ट्री।",
  "plantationReports.reportSpeciesWiseDesc":
    "प्रजाति संरचना, देशी मिश्रण हिस्सेदारी, औसत स्वास्थ्य और प्रजाति-वार कार्बन स्टॉक।",
  "plantationReports.reportWorkAreaDesc":
    "क्षेत्र, पेड़ घनत्व, NDVI ट्रेंड और SAR अखंडता अलर्ट के साथ कार्य-क्षेत्र निगरानी।",
  "plantationReports.reportSurvivalMortalityDesc":
    "जीवित, तनावग्रस्त, मृत और प्रतिस्थापित गणना मृत्यु दर और प्रतिस्थापन बैकलॉग के साथ।",
  "plantationReports.reportComplianceViolationsDesc":
    "गंभीरता, परियोजना और कार्य-क्षेत्र संदर्भ के साथ खुले और हल किए गए अनुपालन उल्लंघन।",
  "plantationReports.reportSatelliteHealthDesc":
    "प्रति कार्य क्षेत्र NDVI औसत, आधार रेखा बनाम परिवर्तन, अलर्ट संख्या और अंतिम उपग्रह स्कैन।",
  "plantationReports.reportSchemeKpiDesc":
    "CAMPA, NHAI, ग्रीन क्रेडिट और अन्य योजना लक्ष्यों की तुलना वास्तविक KPI से।",
  "plantationReports.reportFieldTeamDesc":
    "प्रति फील्ड कर्मचारी पंजीकृत पेड़ और पुनः जियोटैग सर्वेक्षण पूर्णता दर।",
  "plantationReports.reportCarbonStockDesc":
    "मॉडल अनिश्चितता बैंड के साथ परियोजना या वित्तीय वर्ष के अनुसार कुल tCO₂e।",
  "plantationReports.reportPhotoEvidenceDesc":
    "पेड़ कोड, कैप्चर तिथि, URL और GPS मेल स्थिति के साथ सत्यापनकर्ता-तैयार फोटो सूची।",
  "plantationReports.reportDistrictBlockDesc":
    "सरकारी प्रशासनिक रिपोर्टिंग के लिए राज्य, जिला और ब्लॉक रोल-अप।",
  "plantationReports.reportPendingRegistrationDesc":
    "परियोजना और वित्तीय वर्ष के अनुसार लक्ष्य घटा पंजीकृत पेड़।",
  "plantationReports.reportOutOfFenceDesc":
    "अनुमोदित कार्य-क्षेत्र बहुभुज सीमा के बाहर पंजीकृत पेड़।",
  "plantationReports.loading": "रिपोर्ट डेटा लोड हो रहा है…",
  "plantationReports.loadError": "रिपोर्ट डेटा लोड नहीं हो सका। रिफ्रेश करें या कनेक्शन जाँचें।",
  "plantationReports.noProjects": "आपके खाते के लिए कोई रोपण परियोजना नहीं मिली।",
  "plantationReports.noFyData":
    "अभी वित्तीय वर्ष मेटाडेटा वाली कोई परियोजना नहीं। सेटअप के दौरान परियोजना स्थान पर FY सेट करें।",
  "plantationReports.noReGeotagDue": "सभी पेड़ सर्वेक्षण अंतराल के भीतर — कोई पुनः जियोटैग बैकलॉग नहीं।",
  "plantationReports.noTrees": "अभी कोई पंजीकृत पेड़ नहीं।",
  "plantationReports.reGeotagSummary":
    "आपके पोर्टफोलियो में {count} पेड़ पुनः जियोटैग / उत्तरजीविता सर्वेक्षण के लिए देय हैं।",
  "plantationReports.metricProjects": "परियोजनाएँ",
  "plantationReports.metricTrees": "पंजीकृत पेड़",
  "plantationReports.metricReGeotagDue": "पुनः जियोटैग देय",
  "plantationReports.metricViolations": "खुले उल्लंघन",
  "chrome.breadcrumbPlantationReports": "रोपण रिपोर्ट",
  "chrome.reportComplianceExports": "अनुपालन और फ्रेमवर्क निर्यात",
  "chrome.reportProjectWise": "परियोजना-वार रोपण",
  "chrome.reportFyWise": "वित्तीय वर्ष-वार रिपोर्ट",
  "chrome.reportReGeotag": "पुनः जियोटैग रिपोर्ट",
  "chrome.reportTotalRecords": "कुल रोपण रिकॉर्ड",
  "chrome.reportSpeciesWise": "प्रजाति-वार सारांश",
  "chrome.reportWorkArea": "कार्य क्षेत्र / साइट रिपोर्ट",
  "chrome.reportSurvivalMortality": "उत्तरजीविता और मृत्यु दर",
  "chrome.reportComplianceViolations": "अनुपालन उल्लंघन",
  "chrome.reportSatelliteHealth": "उपग्रह स्वास्थ्य रिपोर्ट",
  "chrome.reportSchemeKpi": "योजना KPI (CAMPA / NHAI)",
  "chrome.reportFieldTeam": "फील्ड टीम प्रदर्शन",
  "chrome.reportCarbonStock": "कार्बन स्टॉक रिपोर्ट",
  "chrome.reportPhotoEvidence": "फोटो प्रमाण पैक",
  "chrome.reportDistrictBlock": "जिला / ब्लॉक प्रशासन",
  "chrome.reportPendingRegistration": "लंबित पंजीकरण",
  "chrome.reportOutOfFence": "बाड़ के बाहर के पेड़",
  "roles.platformNgo": "गैर-सरकारी संगठन",
  "projectCompliance.sectionEmissionsShort": "जीएचजी",
  "satellite.isroLabel": "इसरो · {label}",
  "executive.shannon": "शैनन H′",
  "executive.pdfExcel": "पीडीएफ / एक्सेल",
  "executive.signalNdvi": "एनडीवीआई",
  "executive.mrvStageMrv": "एमआरवी",
  "executive.severityCritical": "गंभीर",
  "executive.severityHigh": "उच्च",
  "executive.severityMedium": "मध्यम",
  "executive.avgSurvival": "औसत उत्तरजीविता",
  "executive.geoTagged": "जियो-टैग किया",
  "executive.districts": "जिले",
  "executive.blocks": "ब्लॉक",
  "executive.fullReport": "पूर्ण रिपोर्ट",
  "executive.schemeDeliveryRollup": "योजना वितरण रोलअप",
  "executive.compliancePosture": "अनुपालन स्थिति",
  "executive.readinessAcrossProjects": "{count} परियोजना(ओं) में तत्परता, उल्लंघन और सुरक्षा",
  "executive.avgReadiness": "औसत तत्परता",
  "executive.blocking": "अवरोधक",
  "executive.safeguardGaps": "सुरक्षा अंतराल",
  "executive.orgExports": "संगठन निर्यात",
  "executive.sarAvgIntegrity": "औसत अखंडता",
  "executive.sarAtRisk": "जोखिम में",
  "executive.sarDivergent": "विसंगत",
  "executive.sarFieldTasks": "फील्ड कार्य",
  "executive.sarAlignedSummary": "{aligned} संरेखित · {live} लाइव SAR प्रदाता · {stub} स्टब",
  "executive.sarNoData": "कोई SAR नहीं",
  "executive.sarIntegrityValue": "अखंडता {value}",
  "executive.loadingSar": "SAR बुद्धिमत्ता लोड हो रही है…",
  "executive.loadingThreatWatch": "स्थान-विशिष्ट मौसम और कीट अलर्ट लोड हो रहे हैं…",
  "executive.threatWatchUnavailable":
    "खतरा निगरानी अनुपलब्ध। स्थान अलर्ट के लिए रोपण कार्य क्षेत्र जोड़ें।",
  "executive.highPestRisk": "उच्च कीट जोखिम",
  "executive.locustWatch": "टिड्डी निगरानी",
  "executive.weatherAlerts": "मौसम अलर्ट",
  "executive.noSitesThreat":
    "अभी कोई रोपण स्थल नहीं। स्थान अलर्ट के लिए उपग्रह मानचित्र पर कार्य क्षेत्र बनाएँ।",
  "executive.addPlantationSite": "रोपण स्थल जोड़ें",
  "executive.monitoring": "निगरानी",
  "opsStatus.portfolioAttentionSummary": "{details}",
  "opsStatus.fieldAttentionSummary": "{details}",
  "opsStatus.alertsAttentionSummary": "{details}",
  "dataTrust.sentinelHub": "सेंटिनल हब",
  "fieldWorker.todaysPriorities": "आज की प्राथमिकताएँ",
  "fieldWorker.todaysPrioritiesSub": "उत्तरजीविता, जियोटैग और अनुपालन आइटम",
  "fieldWorker.nothingDueTitle": "अभी कुछ देय नहीं",
  "fieldWorker.nothingDueDesc": "आपकी कतार में कोई अवशेष जाँच, जियोटैग अपडेट या खुला उल्लंघन नहीं।",
  "fieldWorker.assignedProjectsRecent": "असाइन परियोजनाएँ और हाल के पेड़",
  "fieldWorker.assignedProjectsRecentDesc": "पैकेज खोलें या फील्ड सर्वेक्षण जारी रखें",
  "fieldWorker.openPackageRegister": "पेड़ पंजीकृत करने के लिए पैकेज खोलें",
  "fieldWorker.myProjects": "मेरी परियोजनाएँ",
  "fieldWorker.packagesWorkAreas": "पैकेज और कार्य क्षेत्र",
  "fieldWorker.fieldMap": "फील्ड मानचित्र",
  "fieldWorker.findNearbyTrees": "निकटवर्ती पेड़ खोजें",
  "marketing.platformScaleAria": "प्लेटफ़ॉर्म पैमाना",
  "marketing.home.complianceGroupIndia": "भारत और सार्वजनिक कार्यक्रम",
  "marketing.home.complianceGroupCarbon": "कार्बन और प्रकटीकरण",
  "marketing.home.complianceGroupNature": "प्रकृति और अखंडता",
  "marketing.home.pipelineAria": "फील्ड कैप्चर से ऑडिट निर्यात तक प्रमाण प्रवाह",
  "marketing.home.pipelineField": "फील्ड",
  "marketing.home.pipelineFieldDetail": "GPS · फोटो · चेनेज",
  "marketing.home.pipelineOrbit": "ऑर्बिट",
  "marketing.home.pipelineOrbitDetail": "NDVI + SAR फ्यूजन",
  "marketing.home.pipelineHabitat": "आवास",
  "marketing.home.pipelineHabitatDetail": "BirdNET समृद्धि",
  "marketing.home.pipelineAi": "AI",
  "marketing.home.pipelineAiDetail": "स्वास्थ्य + अलर्ट",
  "marketing.home.pipelineAudit": "ऑडिट",
  "marketing.home.pipelineAuditDetail": "हस्ताक्षरित निर्यात",
  "marketing.home.edgeSarTitle": "SAR + NDVI फ्यूजन",
  "marketing.home.edgeSarCopy": "सेंटिनल और NISAR अखंडता — केवल हरियाली नहीं।",
  "marketing.home.edgeBioTitle": "BirdNET + Darwin Core",
  "marketing.home.edgeBioCopy": "आवास प्रमाण जो अधिकांश ऐप कभी कैप्चर नहीं करते।",
  "marketing.home.edgeIndiaTitle": "भारत योजना नियम",
  "marketing.home.edgeIndiaCopy": "NHAI चेनेज, CAMPA, नगर वन, DPDP, 8 भाषाएँ।",
  "marketing.home.edgeAuditTitle": "हस्ताक्षरित ऑडिट श्रृंखला",
  "marketing.home.edgeAuditCopy": "Ed25519 प्रमाण पैक। हम ऑडिट तैयार करते हैं — क्रेडिट जारी नहीं करते।",
  "marketing.home.ghgEyebrow": "परियोजना कार्बन बुद्धिमत्ता",
  "marketing.home.ghgTitle": "आपकी सीमा के भीतर परियोजना GHG उत्सर्जन",
  "marketing.home.ghgCta": "उत्सर्जन कार्यक्षेत्र खोलें",
  "marketing.home.bioEyebrow": "जैव विविधता बुद्धिमत्ता",
  "marketing.home.bioTitle": "परिदृश्य को सुनें",
  "marketing.home.bioCopy": "फील्ड ध्वनि को जैव विविधता प्रमाण में बदलें।",
  "marketing.home.bioCta": "जैव ध्वनि कार्यक्षेत्र खोलें",
  "marketing.home.bioPipeline1": "फील्ड रिकॉर्डिंग",
  "marketing.home.bioPipeline2": "जैव ध्वनि इंजन",
  "marketing.home.bioPipeline3": "प्रजाति मॉडल",
  "marketing.home.bioPipeline4": "सत्यापित प्रमाण",
};

const enPatches = {
  "executive.severityCritical": "CRITICAL",
  "executive.severityHigh": "HIGH",
  "executive.severityMedium": "MEDIUM",
  "executive.avgSurvival": "Avg survival",
  "executive.geoTagged": "Geo-tagged",
  "executive.districts": "districts",
  "executive.blocks": "blocks",
  "executive.fullReport": "Full report",
  "executive.schemeDeliveryRollup": "scheme delivery rollup",
  "executive.compliancePosture": "Compliance posture",
  "executive.readinessAcrossProjects": "Readiness, violations, and safeguards across {count} project(s)",
  "executive.avgReadiness": "Avg readiness",
  "executive.blocking": "Blocking",
  "executive.safeguardGaps": "Safeguard gaps",
  "executive.orgExports": "Org exports",
  "executive.sarAvgIntegrity": "Avg integrity",
  "executive.sarAtRisk": "At risk",
  "executive.sarDivergent": "Divergent",
  "executive.sarFieldTasks": "Field tasks",
  "executive.sarAlignedSummary": "{aligned} aligned · {live} live SAR providers · {stub} stub",
  "executive.sarNoData": "No SAR",
  "executive.sarIntegrityValue": "Integrity {value}",
  "executive.loadingSar": "Loading SAR intelligence…",
  "executive.loadingThreatWatch": "Loading location-specific weather & pest alerts…",
  "executive.threatWatchUnavailable":
    "Threat watch unavailable. Add plantation work areas to enable location alerts.",
  "executive.highPestRisk": "High pest risk",
  "executive.locustWatch": "Locust watch",
  "executive.weatherAlerts": "Weather alerts",
  "executive.noSitesThreat":
    "No plantation sites yet. Draw work areas on the satellite map to get location alerts.",
  "executive.addPlantationSite": "Add plantation site",
  "executive.monitoring": "Monitoring",
  "fieldWorker.todaysPriorities": "Today's priorities",
  "fieldWorker.todaysPrioritiesSub": "Survival, geotag, and compliance items",
  "fieldWorker.nothingDueTitle": "Nothing due right now",
  "fieldWorker.nothingDueDesc": "No survival checks, geotag updates, or open violations in your queue.",
  "fieldWorker.assignedProjectsRecent": "Assigned projects & recent trees",
  "fieldWorker.assignedProjectsRecentDesc": "Open a package or continue field surveys",
  "fieldWorker.openPackageRegister": "Open a package to register trees",
  "fieldWorker.myProjects": "My projects",
  "fieldWorker.packagesWorkAreas": "Packages & work areas",
  "fieldWorker.fieldMap": "Field map",
  "fieldWorker.findNearbyTrees": "Find nearby trees",
  "marketing.platformScaleAria": "Platform scale",
  "marketing.home.complianceGroupIndia": "India & public programs",
  "marketing.home.complianceGroupCarbon": "Carbon & disclosure",
  "marketing.home.complianceGroupNature": "Nature & integrity",
  "marketing.home.pipelineAria": "Evidence flowing from field capture to audit export",
  "marketing.home.pipelineField": "Field",
  "marketing.home.pipelineFieldDetail": "GPS · photos · chainage",
  "marketing.home.pipelineOrbit": "Orbit",
  "marketing.home.pipelineOrbitDetail": "NDVI + SAR fusion",
  "marketing.home.pipelineHabitat": "Habitat",
  "marketing.home.pipelineHabitatDetail": "BirdNET richness",
  "marketing.home.pipelineAi": "AI",
  "marketing.home.pipelineAiDetail": "Health + alerts",
  "marketing.home.pipelineAudit": "Audit",
  "marketing.home.pipelineAuditDetail": "Signed exports",
  "marketing.home.edgeSarTitle": "SAR + NDVI fusion",
  "marketing.home.edgeSarCopy": "Sentinel and NISAR integrity — not greenness alone.",
  "marketing.home.edgeBioTitle": "BirdNET + Darwin Core",
  "marketing.home.edgeBioCopy": "Habitat evidence most tree apps never capture.",
  "marketing.home.edgeIndiaTitle": "India scheme rules",
  "marketing.home.edgeIndiaCopy": "NHAI chainage, CAMPA, Nagar Van, DPDP, 8 languages.",
  "marketing.home.edgeAuditTitle": "Signed audit chain",
  "marketing.home.edgeAuditCopy": "Ed25519 evidence packs. We prepare audits — we do not issue credits.",
  "marketing.home.ghgEyebrow": "Project Carbon Intelligence",
  "marketing.home.ghgTitle": "Project GHG emissions within your boundary",
  "marketing.home.ghgCta": "Open emissions workspace",
  "marketing.home.bioEyebrow": "Biodiversity Intelligence",
  "marketing.home.bioTitle": "Listen to the landscape",
  "marketing.home.bioCopy": "Turn field sound into biodiversity evidence.",
  "marketing.home.bioCta": "Open bioacoustic workspace",
  "marketing.home.bioPipeline1": "Field recording",
  "marketing.home.bioPipeline2": "Bioacoustic engine",
  "marketing.home.bioPipeline3": "Species model",
  "marketing.home.bioPipeline4": "Verified evidence",
};

for (const [path, value] of Object.entries(hiPatches)) set(hi, path, value);
for (const [path, value] of Object.entries(enPatches)) set(en, path, value);

writeFileSync(hiPath, `${JSON.stringify(hi, null, 2)}\n`);
writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`);

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

const fe = flatten(en);
const fh = flatten(hi);
const missing = Object.keys(fe).filter((k) => !(k in fh));
const same = Object.keys(fe).filter(
  (k) => fh[k] === fe[k] && typeof fe[k] === "string" && fe[k].length > 2 && !/^\{/.test(fe[k]),
);
console.log(`Patched. Missing in HI: ${missing.length}. Same as EN (excl placeholders): ${same.length}`);
if (same.length) console.log(same.join("\n"));
