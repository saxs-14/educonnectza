import asyncHandler from 'express-async-handler';
import SchoolMicrosite from '../models/SchoolMicrosite.js';
import SchoolBranding from '../models/SchoolBranding.js';
import School from '../models/School.js';
import { isSameSchool } from '../utils/authz.js';

// @desc    Get public school microsite by slug
// @route   GET /api/v1/microsites/:slug
// @access  Public
export const getPublicMicrosite = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const microsite = await SchoolMicrosite.findOne({ slug: slug.toLowerCase(), enabled: true })
    .populate('schoolId', 'name code district province')
    .lean();

  if (!microsite) {
    res.status(404);
    throw new Error('School microsite not found or unavailable');
  }

  // Fetch associated school branding
  const branding = await SchoolBranding.findOne({ schoolId: microsite.schoolId._id }).lean();

  // Return strictly public-safe information
  res.json({
    success: true,
    microsite: {
      schoolName: microsite.schoolId.name,
      district: microsite.schoolId.district,
      province: microsite.schoolId.province,
      slug: microsite.slug,
      heroText: microsite.heroText,
      aboutUs: microsite.aboutUs,
      principalMessage: microsite.principalMessage,
      achievements: microsite.achievements || [],
      contactInfo: microsite.contactInfo || {},
      socialLinks: microsite.socialLinks || {},
      publicAnnouncements: microsite.publicAnnouncements || [],
    },
    branding: branding || {
      primaryColor: '#1e3a8a',
      secondaryColor: '#0d9488',
      accentColor: '#f59e0b',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      motto: 'Excellence in Education',
      logoUrl: '/assets/default-logo.png',
      bannerUrl: '/assets/default-banner.jpg',
    },
  });
});

// @desc    Update school microsite configuration
// @route   PUT /api/v1/microsites/school/:schoolId
// @access  Private (SchoolAdmin, DevAdmin)
export const updateMicrositeConfig = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;

  if (!isSameSchool(req.user, schoolId)) {
    res.status(403);
    throw new Error('Not authorized to update microsite for this school');
  }

  const {
    slug,
    enabled,
    heroText,
    aboutUs,
    principalMessage,
    achievements,
    contactInfo,
    socialLinks,
    publicAnnouncements,
  } = req.body;

  let microsite = await SchoolMicrosite.findOne({ schoolId });

  if (slug && (!microsite || microsite.slug !== slug.toLowerCase())) {
    const existingSlug = await SchoolMicrosite.findOne({
      slug: slug.toLowerCase(),
      schoolId: { $ne: schoolId },
    });
    if (existingSlug) {
      res.status(400);
      throw new Error('Microsite URL slug is already taken by another school');
    }
  }

  if (!microsite) {
    const school = await School.findById(schoolId);
    if (!school) {
      res.status(404);
      throw new Error('School not found');
    }
    const defaultSlug = slug || school.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    microsite = new SchoolMicrosite({
      schoolId,
      slug: defaultSlug,
    });
  }

  if (slug) microsite.slug = slug.toLowerCase();
  if (enabled !== undefined) microsite.enabled = enabled;
  if (heroText !== undefined) microsite.heroText = heroText;
  if (aboutUs !== undefined) microsite.aboutUs = aboutUs;
  if (principalMessage !== undefined) microsite.principalMessage = principalMessage;
  if (achievements !== undefined) microsite.achievements = achievements;
  if (contactInfo !== undefined) microsite.contactInfo = contactInfo;
  if (socialLinks !== undefined) microsite.socialLinks = socialLinks;
  if (publicAnnouncements !== undefined) microsite.publicAnnouncements = publicAnnouncements;

  await microsite.save();

  res.json({ success: true, microsite });
});
