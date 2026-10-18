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
exports.Assessment = exports.ResultVisibility = exports.AssessmentStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var AssessmentStatus;
(function (AssessmentStatus) {
    AssessmentStatus["DRAFT"] = "DRAFT";
    AssessmentStatus["PUBLISHED"] = "PUBLISHED";
    AssessmentStatus["OPEN"] = "OPEN";
    AssessmentStatus["PAUSED"] = "PAUSED";
    AssessmentStatus["CLOSED"] = "CLOSED";
    AssessmentStatus["RESULTS_PUBLISHED"] = "RESULTS_PUBLISHED";
    AssessmentStatus["ARCHIVED"] = "ARCHIVED";
})(AssessmentStatus || (exports.AssessmentStatus = AssessmentStatus = {}));
var ResultVisibility;
(function (ResultVisibility) {
    ResultVisibility["NOT_PUBLISHED"] = "NOT_PUBLISHED";
    ResultVisibility["SCORE_ONLY"] = "SCORE_ONLY";
    ResultVisibility["SCORE_AND_ANSWERS"] = "SCORE_AND_ANSWERS";
    ResultVisibility["HIDDEN"] = "HIDDEN";
})(ResultVisibility || (exports.ResultVisibility = ResultVisibility = {}));
const AssessmentSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, required: true, min: 1 },
    totalQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, default: 60 },
    passPercentage: { type: Number, default: 40 },
    allowedAttempts: { type: Number, default: 1 },
    negativeMarking: { type: Number, default: 0 },
    openAt: { type: Date, required: true },
    closeAt: { type: Date, required: true },
    status: { type: String, enum: Object.values(AssessmentStatus), default: AssessmentStatus.DRAFT },
    resultVisibility: { type: String, enum: Object.values(ResultVisibility), default: ResultVisibility.SCORE_ONLY },
    allowedEligibilityTags: [{ type: String }],
    eligibleStudentIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    integrityPolicy: {
        maxTabSwitches: { type: Number, default: 3 },
        cameraRequired: { type: Boolean, default: true },
        microphoneRequired: { type: Boolean, default: false },
        shuffleQuestions: { type: Boolean, default: true },
        shuffleOptions: { type: Boolean, default: true }
    },
    createdById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
exports.Assessment = mongoose_1.default.model('Assessment', AssessmentSchema);
