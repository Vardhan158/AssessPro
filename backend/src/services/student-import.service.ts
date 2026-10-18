import mongoose from 'mongoose';
import { User, UserRole, UserStatus } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { generateActivationToken } from './auth.service';
import { generateStudentId } from './student-id.service';
import { sendActivationEmail } from './email.service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as XLSX from 'xlsx';

export interface CandidateRowInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  collegeName?: string;
  branch?: string;
  yearOfStudy?: string;
}

export interface CandidateValidationResult {
  rowNumber: number;
  data: CandidateRowInput;
  status: 'VALID' | 'DUPLICATE' | 'INVALID';
  errors: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCSV(csvContent: string): CandidateRowInput[] {
  const lines = csvContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  const getIndex = (keys: string[]): number => {
    return headers.findIndex(h => keys.some(k => h.includes(k)));
  };

  const fnIdx = getIndex(['first', 'fname', 'name']);
  const lnIdx = getIndex(['last', 'lname', 'surname']);
  const emailIdx = getIndex(['email', 'mail']);
  const phoneIdx = getIndex(['phone', 'mobile', 'contact']);
  const collegeIdx = getIndex(['college', 'university', 'institution', 'school']);
  const branchIdx = getIndex(['branch', 'department', 'stream', 'course']);
  const yearIdx = getIndex(['year', 'batch']);

  const rows: CandidateRowInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length === 0 || !cols.some(Boolean)) continue;

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

export function parseFileBuffer(buffer: Buffer, originalname: string): CandidateRowInput[] {
  const ext = originalname.toLowerCase();
  if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || buffer.slice(0, 4).toString('hex') === '504b0304') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rawRows.length <= 1) return [];

    const headers = (rawRows[0] || []).map((h: any) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

    const getIndex = (keys: string[]): number => {
      return headers.findIndex((h: string) => keys.some(k => h.includes(k)));
    };

    const fnIdx = getIndex(['first', 'fname', 'name']);
    const lnIdx = getIndex(['last', 'lname', 'surname']);
    const emailIdx = getIndex(['email', 'mail']);
    const phoneIdx = getIndex(['phone', 'mobile', 'contact']);
    const collegeIdx = getIndex(['college', 'university', 'institution', 'school']);
    const branchIdx = getIndex(['branch', 'department', 'stream', 'course']);
    const yearIdx = getIndex(['year', 'batch']);

    const rows: CandidateRowInput[] = [];

    for (let i = 1; i < rawRows.length; i++) {
      const cols = rawRows[i] || [];
      if (!Array.isArray(cols) || cols.length === 0 || !cols.some(Boolean)) continue;

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

export async function validateCandidateRows(rows: CandidateRowInput[]): Promise<CandidateValidationResult[]> {
  const seenEmails = new Set<string>();
  const emailList = rows.map(r => r.email.trim().toLowerCase()).filter(Boolean);

  let existingEmailSet = new Set<string>();
  if (mongoose.connection.readyState === 1 && emailList.length > 0) {
    try {
      const existingUsers = await User.find({ email: { $in: emailList } }).select('email');
      existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));
    } catch {
      // Graceful fallback for offline unit testing
    }
  }

  const results: CandidateValidationResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];
    const emailNorm = row.email.trim().toLowerCase();

    if (!row.firstName?.trim()) errors.push('First name is required');
    if (!row.lastName?.trim()) errors.push('Last name is required');
    if (!row.email?.trim()) {
      errors.push('Email is required');
    } else if (!EMAIL_REGEX.test(emailNorm)) {
      errors.push('Invalid email format');
    }

    let status: 'VALID' | 'DUPLICATE' | 'INVALID' = errors.length > 0 ? 'INVALID' : 'VALID';

    if (status === 'VALID') {
      if (seenEmails.has(emailNorm)) {
        status = 'DUPLICATE';
        errors.push('Duplicate email address in file');
      } else if (existingEmailSet.has(emailNorm)) {
        status = 'DUPLICATE';
        errors.push('Candidate with this email address already exists in the system');
      } else {
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

export async function processBatchImport(validRows: CandidateRowInput[]) {
  const tempPasswordHash = await bcrypt.hash('TEMP_PENDING_ACTIVATION', 10);
  const createdCandidates = [];

  for (const candidateData of validRows) {
    const emailNorm = candidateData.email.trim().toLowerCase();

    const existing = await User.findOne({ email: emailNorm });
    if (existing) continue;

    const { token, expiresAt } = generateActivationToken();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.create({
      email: emailNorm,
      passwordHash: tempPasswordHash,
      role: UserRole.STUDENT,
      status: UserStatus.PENDING_ACTIVATION,
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
        profile = await StudentProfile.create({
          userId: user._id,
          studentId: await generateStudentId(),
          collegeName: candidateData.collegeName || 'Institute of Technology',
          branch: candidateData.branch || 'Computer Science',
          yearOfStudy: candidateData.yearOfStudy || '4th Year',
          phone: candidateData.phone || '',
          eligibilityTags: ['ALL'],
          invitationStatus: 'PENDING'
        });
        break;
      } catch (err: any) {
        if (err?.code !== 11000 || attempt === 4) throw err;
      }
    }

    let invitationStatus: 'SENT' | 'FAILED' = 'FAILED';
    try {
      await sendActivationEmail(user.email, token, user.firstName);
      user.activationTokenLastSentAt = new Date();
      await user.save();
      invitationStatus = 'SENT';
    } catch (emailErr) {
      console.error(`Failed to send activation email to ${user.email}:`, emailErr);
    }

    if (profile) {
      profile.invitationStatus = invitationStatus;
      if (invitationStatus === 'SENT') profile.invitationSentAt = new Date();
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
