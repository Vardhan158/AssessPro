"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logIncident = logIncident;
const Attempt_1 = require("../models/Attempt");
const Assessment_1 = require("../models/Assessment");
const Incident_1 = require("../models/Incident");
const attempt_service_1 = require("./attempt.service");
async function logIncident(attemptId, userId, type, details) {
    const attempt = await Attempt_1.Attempt.findOne({ _id: attemptId, userId });
    if (!attempt)
        return null;
    const assessment = await Assessment_1.Assessment.findById(attempt.assessmentId);
    const maxSwitches = assessment?.integrityPolicy?.maxTabSwitches || 3;
    const maxDisconnects = 5; // STU-13 policy: Maximum 5 allowed network disconnections
    // Duplicate Event Suppression: Ignore duplicate incident reports within a 2-second window
    const recentIncident = await Incident_1.Incident.findOne({
        attemptId: attempt._id,
        type,
        timestamp: { $gte: new Date(Date.now() - 2000) }
    });
    if (recentIncident) {
        return {
            incident: recentIncident,
            autoSubmitted: attempt.status === Attempt_1.AttemptStatus.AUTO_SUBMITTED,
            tabSwitches: attempt.totalTabSwitches,
            maxSwitches,
            networkDisconnects: attempt.networkDisconnectsCount,
            maxDisconnects
        };
    }
    let severity = Incident_1.IncidentSeverity.MEDIUM;
    if (type === Incident_1.IncidentType.TAB_SWITCH) {
        attempt.totalTabSwitches += 1;
        await attempt.save();
        if (attempt.totalTabSwitches >= maxSwitches) {
            severity = Incident_1.IncidentSeverity.CRITICAL;
        }
    }
    else if (type === Incident_1.IncidentType.FULLSCREEN_EXIT) {
        severity = Incident_1.IncidentSeverity.HIGH;
    }
    else if (type === Incident_1.IncidentType.CAMERA_DISCONNECT) {
        severity = Incident_1.IncidentSeverity.HIGH;
    }
    else if (type === Incident_1.IncidentType.CAMERA_SNAPSHOT) {
        attempt.cameraSnapshotsCount += 1;
        await attempt.save();
        severity = Incident_1.IncidentSeverity.LOW;
    }
    else if (type === Incident_1.IncidentType.NETWORK_DISCONNECT) {
        attempt.networkDisconnectsCount += 1;
        await attempt.save();
        severity = attempt.networkDisconnectsCount > maxDisconnects ? Incident_1.IncidentSeverity.CRITICAL : Incident_1.IncidentSeverity.LOW;
    }
    const incident = await Incident_1.Incident.create({
        attemptId: attempt._id,
        assessmentId: attempt.assessmentId,
        userId: attempt.userId,
        type,
        severity,
        status: Incident_1.IncidentStatus.LOGGED,
        details,
        timestamp: new Date()
    });
    // Auto-submit on exceeding max network disconnects limit (5)
    if (attempt.networkDisconnectsCount > maxDisconnects && attempt.status === Attempt_1.AttemptStatus.IN_PROGRESS) {
        await (0, attempt_service_1.submitAttempt)(attemptId, userId, true);
        return {
            incident,
            autoSubmitted: true,
            tabSwitches: attempt.totalTabSwitches,
            maxSwitches,
            networkDisconnects: attempt.networkDisconnectsCount,
            maxDisconnects,
            message: 'Exceeded maximum allowed network disconnections (5/5). Attempt automatically finalized.'
        };
    }
    return {
        incident,
        autoSubmitted: false,
        tabSwitches: attempt.totalTabSwitches,
        maxSwitches,
        networkDisconnects: attempt.networkDisconnectsCount,
        maxDisconnects
    };
}
