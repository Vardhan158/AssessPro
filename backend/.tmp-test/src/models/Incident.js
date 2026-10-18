"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Incident = exports.IncidentStatus = exports.IncidentSeverity = exports.IncidentType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var IncidentType;
(function (IncidentType) {
    IncidentType["TAB_SWITCH"] = "TAB_SWITCH";
    IncidentType["FULLSCREEN_EXIT"] = "FULLSCREEN_EXIT";
    IncidentType["CAMERA_DISCONNECT"] = "CAMERA_DISCONNECT";
    IncidentType["CAMERA_SNAPSHOT"] = "CAMERA_SNAPSHOT";
    IncidentType["MULTIPLE_FACES"] = "MULTIPLE_FACES";
    IncidentType["NETWORK_DISCONNECT"] = "NETWORK_DISCONNECT";
})(IncidentType || (exports.IncidentType = IncidentType = {}));
var IncidentSeverity;
(function (IncidentSeverity) {
    IncidentSeverity["LOW"] = "LOW";
    IncidentSeverity["MEDIUM"] = "MEDIUM";
    IncidentSeverity["HIGH"] = "HIGH";
    IncidentSeverity["CRITICAL"] = "CRITICAL";
})(IncidentSeverity || (exports.IncidentSeverity = IncidentSeverity = {}));
var IncidentStatus;
(function (IncidentStatus) {
    IncidentStatus["LOGGED"] = "LOGGED";
    IncidentStatus["FLAGGED"] = "FLAGGED";
    IncidentStatus["REVIEWED_APPROVED"] = "REVIEWED_APPROVED";
    IncidentStatus["REVIEWED_REJECTED"] = "REVIEWED_REJECTED";
    IncidentStatus["PENDING"] = "PENDING";
    IncidentStatus["REVIEWED"] = "REVIEWED";
    IncidentStatus["NEEDS_INVESTIGATION"] = "NEEDS_INVESTIGATION";
})(IncidentStatus || (exports.IncidentStatus = IncidentStatus = {}));
const IncidentSchema = new mongoose_1.Schema({
    attemptId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Attempt', required: true },
    assessmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(IncidentType), required: true },
    severity: { type: String, enum: Object.values(IncidentSeverity), default: IncidentSeverity.MEDIUM },
    status: { type: String, enum: Object.values(IncidentStatus), default: IncidentStatus.LOGGED },
    details: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    reviewerNotes: { type: String }
}, { timestamps: true });
exports.Incident = mongoose_1.default.model('Incident', IncidentSchema);
