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
exports.Attempt = exports.AttemptStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var AttemptStatus;
(function (AttemptStatus) {
    AttemptStatus["NOT_STARTED"] = "NOT_STARTED";
    AttemptStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AttemptStatus["SUBMITTED"] = "SUBMITTED";
    AttemptStatus["TIMED_OUT"] = "TIMED_OUT";
    AttemptStatus["AUTO_SUBMITTED"] = "AUTO_SUBMITTED";
    AttemptStatus["FORCE_SUBMITTED"] = "FORCE_SUBMITTED";
    AttemptStatus["SCORED"] = "SCORED"; // Evaluation completed
})(AttemptStatus || (exports.AttemptStatus = AttemptStatus = {}));
const AttemptSchema = new mongoose_1.Schema({
    assessmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    paperVersionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PaperVersion', required: true },
    status: { type: String, enum: Object.values(AttemptStatus), default: AttemptStatus.IN_PROGRESS },
    finalizedReason: { type: String },
    isScored: { type: Boolean, default: false },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, required: true },
    submittedAt: { type: Date },
    score: { type: Number },
    totalMarks: { type: Number },
    percentage: { type: Number },
    passed: { type: Boolean },
    totalTabSwitches: { type: Number, default: 0 },
    cameraSnapshotsCount: { type: Number, default: 0 },
    networkDisconnectsCount: { type: Number, default: 0 }
}, { timestamps: true });
AttemptSchema.index({ assessmentId: 1, userId: 1 }, { unique: true });
exports.Attempt = mongoose_1.default.model('Attempt', AttemptSchema);
