import { Attempt, AttemptStatus } from '../models/Attempt';
import { Assessment } from '../models/Assessment';
import { Incident, IncidentType, IncidentSeverity, IncidentStatus } from '../models/Incident';
import { submitAttempt } from './attempt.service';

export async function logIncident(attemptId: string, userId: string, type: IncidentType, details: string) {
  const attempt = await Attempt.findOne({ _id: attemptId, userId });
  if (!attempt) return null;

  const assessment = await Assessment.findById(attempt.assessmentId);
  const maxSwitches = assessment?.integrityPolicy?.maxTabSwitches || 3;
  const maxDisconnects = 5; // STU-13 policy: Maximum 5 allowed network disconnections

  // Duplicate Event Suppression: Ignore duplicate incident reports within a 2-second window
  const recentIncident = await Incident.findOne({
    attemptId: attempt._id,
    type,
    timestamp: { $gte: new Date(Date.now() - 2000) }
  });

  if (recentIncident) {
    return {
      incident: recentIncident,
      autoSubmitted: attempt.status === AttemptStatus.AUTO_SUBMITTED,
      tabSwitches: attempt.totalTabSwitches,
      maxSwitches,
      networkDisconnects: attempt.networkDisconnectsCount,
      maxDisconnects
    };
  }

  let severity = IncidentSeverity.MEDIUM;

  if (type === IncidentType.TAB_SWITCH) {
    attempt.totalTabSwitches += 1;
    await attempt.save();

    if (attempt.totalTabSwitches >= maxSwitches) {
      severity = IncidentSeverity.CRITICAL;
    }
  } else if (type === IncidentType.FULLSCREEN_EXIT) {
    severity = IncidentSeverity.HIGH;
  } else if (type === IncidentType.CAMERA_DISCONNECT) {
    severity = IncidentSeverity.HIGH;
  } else if (type === IncidentType.CAMERA_SNAPSHOT) {
    attempt.cameraSnapshotsCount += 1;
    await attempt.save();
    severity = IncidentSeverity.LOW;
  } else if (type === IncidentType.NETWORK_DISCONNECT) {
    attempt.networkDisconnectsCount += 1;
    await attempt.save();
    severity = attempt.networkDisconnectsCount > maxDisconnects ? IncidentSeverity.CRITICAL : IncidentSeverity.LOW;
  }

  const incident = await Incident.create({
    attemptId: attempt._id,
    assessmentId: attempt.assessmentId,
    userId: attempt.userId,
    type,
    severity,
    status: IncidentStatus.LOGGED,
    details,
    timestamp: new Date()
  });

  // Auto-submit on exceeding max network disconnects limit (5)
  if (attempt.networkDisconnectsCount > maxDisconnects && attempt.status === AttemptStatus.IN_PROGRESS) {
    await submitAttempt(attemptId, userId, true);
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
