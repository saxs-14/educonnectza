import asyncHandler from 'express-async-handler';
import SchoolBranding from '../models/SchoolBranding.js';
import School from '../models/School.js';
import { isSameSchool } from '../utils/authz.js';
import { uploadFile, deleteFile } from '../utils/storageService.js';
import { verifyContrast } from '../utils/colorContrast.js';

// @desc    Get branding for a school
// @route   GET /api/v1/branding/:schoolId
// @access  Public / Authenticated
export const getSchoolBranding = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;

  let branding = await SchoolBranding.findOne({ schoolId });
  if (!branding) {
    // Return default branding if not explicitly customized yet
    branding = {
      schoolId,
      logoUrl: '/assets/default-logo.png',
      faviconUrl: '/favicon.ico',
      bannerUrl: '/assets/default-banner.jpg',
      primaryColor: '#1e3a8a',
      secondaryColor: '#0d9488',
      accentColor: '#f59e0b',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      motto: 'Excellence in Education',
      isContrastAccessible: true,
    };
  }

  res.json({ success: true, branding });
});

// @desc    Update school branding & colors
// @route   PUT /api/v1/branding/:schoolId
// @access  Private (SchoolAdmin, DevAdmin)
export const updateSchoolBranding = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;

  if (!isSameSchool(req.user, schoolId)) {
    res.status(403);
    throw new Error('Not authorized to manage branding for this school');
  }

  const {
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    textColor,
    motto,
  } = req.body;

  let branding = await SchoolBranding.findOne({ schoolId });
  if (!branding) {
    branding = new SchoolBranding({ schoolId });
  }

  if (primaryColor) branding.primaryColor = primaryColor;
  if (secondaryColor) branding.secondaryColor = secondaryColor;
  if (accentColor) branding.accentColor = accentColor;
  if (backgroundColor) branding.backgroundColor = backgroundColor;
  if (textColor) branding.textColor = textColor;
  if (motto !== undefined) branding.motto = motto;

  // Verify WCAG 2.1 AA Contrast
  const contrastResult = verifyContrast(branding.backgroundColor, branding.textColor);
  branding.isContrastAccessible = contrastResult.isAccessible;

  await branding.save();

  res.json({
    success: true,
    branding,
    accessibility: contrastResult,
  });
});

// @desc    Upload branding asset (logo, favicon, banner)
// @route   POST /api/v1/branding/:schoolId/upload
// @access  Private (SchoolAdmin, DevAdmin)
export const uploadBrandingAsset = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;
  const { category } = req.body; // 'logos', 'favicons', 'banners'

  if (!isSameSchool(req.user, schoolId)) {
    res.status(403);
    throw new Error('Not authorized to upload assets for this school');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const validCategories = ['logos', 'favicons', 'banners'];
  if (!validCategories.includes(category)) {
    res.status(400);
    throw new Error('Invalid asset category. Must be one of: logos, favicons, banners');
  }

  let branding = await SchoolBranding.findOne({ schoolId });
  if (!branding) {
    branding = new SchoolBranding({ schoolId });
  }

  // Upload file to R2 or local disk
  const uploadResult = await uploadFile({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    schoolId,
    category,
  });

  // Delete previous asset if replacing
  if (category === 'logos') {
    if (branding.logoKey) await deleteFile(branding.logoKey);
    branding.logoUrl = uploadResult.url;
    branding.logoKey = uploadResult.key;
  } else if (category === 'favicons') {
    if (branding.faviconKey) await deleteFile(branding.faviconKey);
    branding.faviconUrl = uploadResult.url;
    branding.faviconKey = uploadResult.key;
  } else if (category === 'banners') {
    if (branding.bannerKey) await deleteFile(branding.bannerKey);
    branding.bannerUrl = uploadResult.url;
    branding.bannerKey = uploadResult.key;
  }

  await branding.save();

  res.json({
    success: true,
    category,
    assetUrl: uploadResult.url,
    branding,
  });
});

// @desc    Reset branding to system default
// @route   POST /api/v1/branding/:schoolId/reset
// @access  Private (SchoolAdmin, DevAdmin)
export const resetSchoolBranding = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;

  if (!isSameSchool(req.user, schoolId)) {
    res.status(403);
    throw new Error('Not authorized to reset branding for this school');
  }

  let branding = await SchoolBranding.findOne({ schoolId });
  if (branding) {
    branding.primaryColor = '#1e3a8a';
    branding.secondaryColor = '#0d9488';
    branding.accentColor = '#f59e0b';
    branding.backgroundColor = '#f8fafc';
    branding.textColor = '#0f172a';
    branding.motto = 'Excellence in Education';
    branding.isContrastAccessible = true;
    await branding.save();
  }

  res.json({ success: true, message: 'Branding reset to defaults', branding });
});
