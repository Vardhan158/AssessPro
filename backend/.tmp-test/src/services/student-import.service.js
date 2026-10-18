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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCSV = parseCSV;
exports.parseFileBuffer = parseFileBuffer;
exports.validateCandidateRows = validateCandidateRows;
exports.processBatchImport = processBatchImport;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const StudentProfile_1 = require("../models/StudentProfile");
const auth_service_1 = require("./auth.service");
const student_id_service_1 = require("./student-id.service");
const email_service_1 = require("./email.service");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const XLSX = __importStar(require("xlsx"));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseCSV(csvContent) {
    const lines = csvContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length <= 1)
        return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const getIndex = (keys) => {
        return headers.findIndex(h => keys.some(k => h.includes(k)));
    };
    const fnIdx = getIndex(['first', 'fname', 'name']);
    const lnIdx = getIndex(['last', 'lname', 'surname']);
    const emailIdx = getIndex(['email', 'mail']);
    const phoneIdx = getIndex(['phone', 'mobile', 'contact']);
    const collegeIdx = getIndex(['college', 'university', 'institution', 'school']);
    const branchIdx = getIndex(['branch', 'department', 'stream', 'course']);
    const yearIdx = getIndex(['year', 'batch']);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length === 0 || !cols.some(Boolean))
            continue;
        const firstName = fnIdx !== -1 && cols[fnIdx] ? cols[fnIdx] : (cols[0] || '');
        const lastName = lnIdx !== -1 && cols[lnIdx] ? cols[lnIdx] : (cols[1] || '');
        const email = emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : (cols[2] || '');
        rows.push({
            firstName: firstName || '',
            lastName: lastName || '',
            email: email || '',
            phone: phoneIdx !== -1 ? cols[phoneIdx] : '',
            collegeName: collegeIdx !== -1 ? cols[collegeIdx] : 'Institute of Technology',
            branch: branchIdx !== -1 ? cols[branchIdx] : 'Computer Science',
            yearOfStudy: yearIdx !== -1 ? cols[yearIdx] : '4th Year'
        });
    }
    return rows;
}
function parseFileBuffer(buffer, originalname) {
    const ext = originalname.toLowerCase();
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || buffer.slice(0, 4).toString('hex') === '504b0304') {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rawRows.length <= 1)
            return [];
        const headers = (rawRows[0] || []).map((h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        const getIndex = (keys) => {
            return headers.findIndex((h) => keys.some(k => h.includes(k)));
        };
        const fnIdx = getIndex(['first', 'fname', 'name']);
        const lnIdx = getIndex(['last', 'lname', 'surname']);
        const emailIdx = getIndex(['email', 'mail']);
        const phoneIdx = getIndex(['phone', 'mobile', 'contact']);
        const collegeIdx = getIndex(['college', 'university', 'institution', 'school']);
        const branchIdx = getIndex(['branch', 'department', 'stream', 'course']);
        const yearIdx = getIndex(['year', 'batch']);
        const rows = [];
        for (let i = 1; i < rawRows.length; i++) {
            const cols = rawRows[i] || [];
            if (!Array.isArray(cols) || cols.length === 0 || !cols.some(Boolean))
                continue;
            const firstName = fnIdx !== -1 && cols[fnIdx] ? String(cols[fnIdx]).trim() : (String(cols[0] || '').trim());
            const lastName = lnIdx !== -1 && cols[lnIdx] ? String(cols[lnIdx]).trim() : (String(cols[1] || '').trim());
            const email = emailIdx !== -1 && cols[emailIdx] ? String(cols[emailIdx]).trim() : (String(cols[2] || '').trim());
            rows.push({
                firstName: firstName || '',
                lastName: lastName || '',
                email: email || '',
                phone: phoneIdx !== -1 && cols[phoneIdx] ? String(cols[phoneIdx]).trim() : '',
                collegeName: collegeIdx !== -1 && cols[collegeIdx] ? String(cols[collegeIdx]).trim() : 'Institute of Technology',
                branch: branchIdx !== -1 && cols[branchIdx] ? String(cols[branchIdx]).trim() : 'Computer Science',
                yearOfStudy: yearIdx !== -1 && cols[yearIdx] ? String(cols[yearIdx]).trim() : '4th Year'
            });
        }
        return rows;
    }
    return parseCSV(buffer.toString('utf-8'));
}
async function validateCandidateRows(rows) {
    const seenEmails = new Set();
    const emailList = rows.map(r => r.email.trim().toLowerCase()).filter(Boolean);
    let existingEmailSet = new Set();
    if (mongoose_1.default.connection.readyState === 1 && emailList.length > 0) {
        try {
            const existingUsers = await User_1.User.find({ email: { $in: emailList } }).select('email');
            existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));
        }
        catch {
            // Graceful fallback for offline unit testing
        }
    }
    const results = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const errors = [];
        const emailNorm = row.email.trim().toLowerCase();
        if (!row.firstName?.trim())
            errors.push('First name is required');
        if (!row.lastName?.trim())
            errors.push('Last name is required');
        if (!row.email?.trim()) {
            errors.push('Email is required');
        }
        else if (!EMAIL_REGEX.test(emailNorm)) {
            errors.push('Invalid email format');
        }
        let status = errors.length > 0 ? 'INVALID' : 'VALID';
        if (status === 'VALID') {
            if (seenEmails.has(emailNorm)) {
                status = 'DUPLICATE';
                errors.push('Duplicate email address in file');
            }
            else if (existingEmailSet.has(emailNorm)) {
                status = 'DUPLICATE';
                errors.push('Candidate with this email address already exists in the system');
            }
            else {
                seenEmails.add(emailNorm);
            }
        }
        results.push({
            rowNumber: i + 1,
            data: { ...row, email: emailNorm },
            status,
            errors
        });
    }
    return results;
}
async function processBatchImport(validRows) {
    const tempPasswordHash = await bcryptjs_1.default.hash('TEMP_PENDING_ACTIVATION', 10);
    const createdCandidates = [];
    for (const candidateData of validRows) {
        const emailNorm = candidateData.email.trim().toLowerCase();
        const existing = await User_1.User.findOne({ email: emailNorm });
        if (existing)
            continue;
        const { token, expiresAt } = (0, auth_service_1.generateActivationToken)();
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = await User_1.User.create({
            email: emailNorm,
            passwordHash: tempPasswordHash,
            role: User_1.UserRole.STUDENT,
            status: User_1.UserStatus.PENDING_ACTIVATION,
            firstName: candidateData.firstName.trim(),
            lastName: candidateData.lastName.trim(),
            phone: candidateData.phone || '',
            activationTokenHash: tokenHash,
            activationTokenIssuedAt: new Date(),
            activationTokenExpiresAt: expiresAt
        });
        let profile;
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                profile = await StudentProfile_1.StudentProfile.create({
                    userId: user._id,
                    studentId: await (0, student_id_service_1.generateStudentId)(),
                    collegeName: candidateData.collegeName || 'Institute of Technology',
                    branch: candidateData.branch || 'Computer Science',
                    yearOfStudy: candidateData.yearOfStudy || '4th Year',
                    phone: candidateData.phone || '',
                    eligibilityTags: ['ALL'],
                    invitationStatus: 'PENDING'
                });
                break;
            }
            catch (err) {
                if (err?.code !== 11000 || attempt === 4)
                    throw err;
            }
        }
        let invitationStatus = 'FAILED';
        try {
            await (0, email_service_1.sendActivationEmail)(user.email, token, user.firstName);
            user.activationTokenLastSentAt = new Date();
            await user.save();
            invitationStatus = 'SENT';
        }
        catch (emailErr) {
            console.error(`Failed to send activation email to ${user.email}:`, emailErr);
        }
        if (profile) {
            profile.invitationStatus = invitationStatus;
            if (invitationStatus === 'SENT')
                profile.invitationSentAt = new Date();
            await profile.save();
        }
        createdCandidates.push({
            id: user._id,
            studentId: profile?.studentId || 'N/A',
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            collegeName: profile?.collegeName,
            branch: profile?.branch,
            status: user.status,
            invitationStatus
        });
    }
    return createdCandidates;
}
