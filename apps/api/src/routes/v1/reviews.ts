// API Routes for Review Management
// Handles review submission and retrieval for consultant profiles

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@nakksha/database';
import { validateRequest } from '../../middleware/validation';
import { logger } from '../../utils/logger';

const router = Router();

// Validation schemas
const createReviewSchema = z.object({
  consultantId: z.string().refine(
    (value) => {
      // Allow either CUID format or slug: prefix
      if (value.startsWith('slug:')) {
        const slug = value.replace('slug:', '');
        return slug.length > 0 && /^[a-zA-Z0-9-_]+$/.test(slug);
      }
      // Validate CUID format for direct IDs
      return /^[a-z0-9]{25}$/.test(value);
    },
    {
      message: 'Invalid consultant ID format. Must be either a valid CUID or slug:consultantSlug format'
    }
  ),
  reviewerName: z.string().min(1, 'Name is required').max(100),
  reviewerEmail: z.string().email().optional(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(10, 'Review must be at least 10 characters').max(1000),
  title: z.string().max(100).optional(),
  sessionId: z.string().cuid().optional(),
});

const getReviewsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SPAM']).optional(),
  rating: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default('10'),
  offset: z.string().transform(Number).default('0'),
});

/**
 * POST /api/v1/reviews
 * Submit a new review for a consultant
 */
router.post('/', validateRequest(createReviewSchema), async (req, res) => {
  try {
    let { consultantId, reviewerName, reviewerEmail, rating, reviewText, title, sessionId } = req.body;

    logger.info('📝 Creating new review', {
      consultantId,
      reviewerName,
      rating,
      hasEmail: !!reviewerEmail,
      hasSession: !!sessionId
    });

    // Handle slug-based consultant ID resolution
    let consultant;
    if (consultantId.startsWith('slug:')) {
      const slug = consultantId.replace('slug:', '');
      consultant = await prisma.consultant.findUnique({
        where: { slug },
        select: { id: true, firstName: true, lastName: true, slug: true }
      });
      
      if (!consultant) {
        return res.status(404).json({
          message: 'Consultant not found',
          code: 'CONSULTANT_NOT_FOUND'
        });
      }
      
      // Update consultantId to the actual ID
      consultantId = consultant.id;
    } else {
      // Verify consultant exists by ID
      consultant = await prisma.consultant.findUnique({
        where: { id: consultantId },
        select: { id: true, firstName: true, lastName: true, slug: true }
      });

      if (!consultant) {
        return res.status(404).json({
          message: 'Consultant not found',
          code: 'CONSULTANT_NOT_FOUND'
        });
      }
    }

    // Verify session exists if provided
    if (sessionId) {
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          consultantId,
          status: 'COMPLETED' // Only allow reviews for completed sessions
        }
      });

      if (!session) {
        return res.status(400).json({
          message: 'Session not found or not completed',
          code: 'INVALID_SESSION'
        });
      }
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        consultantId,
        reviewerName,
        reviewerEmail,
        rating,
        reviewText,
        title,
        sessionId,
        status: 'APPROVED', // Auto-approve for now, can add moderation later
        isVerified: !!sessionId, // Mark as verified if linked to a session
        isPublic: true,
        approvedAt: new Date(),
      },
      include: {
        consultant: {
          select: {
            firstName: true,
            lastName: true,
            slug: true
          }
        }
      }
    });

    logger.info('✅ Review created successfully', {
      reviewId: review.id,
      consultantSlug: consultant.slug,
      rating: review.rating
    });

    return res.status(201).json({
      message: 'Review submitted successfully',
      data: {
        review: {
          id: review.id,
          reviewerName: review.reviewerName,
          rating: review.rating,
          reviewText: review.reviewText,
          title: review.title,
          isVerified: review.isVerified,
          createdAt: review.createdAt,
          consultant: review.consultant
        }
      }
    });

  } catch (error: any) {
    logger.error('❌ Error creating review:', error);

    // Handle duplicate review attempts (can add unique constraint later)
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'You have already reviewed this consultant',
        code: 'DUPLICATE_REVIEW'
      });
    }

    return res.status(500).json({
      message: 'Failed to submit review',
      code: 'REVIEW_CREATION_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/reviews/consultant/:slug
 * Get all approved reviews for a consultant (public endpoint)
 */
router.get('/consultant/:slug', validateRequest(getReviewsQuerySchema, 'query'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { status = 'APPROVED', rating, limit, offset } = req.query as any;

    logger.info('📖 Fetching reviews for consultant', { slug, status, rating, limit, offset });

    // Find consultant by slug
    const consultant = await prisma.consultant.findUnique({
      where: { slug },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!consultant) {
      return res.status(404).json({
        message: 'Consultant not found',
        code: 'CONSULTANT_NOT_FOUND'
      });
    }

    // Build where clause
    const whereClause: any = {
      consultantId: consultant.id,
      status,
      isPublic: true
    };

    if (rating) {
      whereClause.rating = rating;
    }

    // Get reviews with pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        select: {
          id: true,
          reviewerName: true,
          rating: true,
          reviewText: true,
          title: true,
          isVerified: true,
          createdAt: true,
          sessionId: true
        },
        orderBy: [
          { isVerified: 'desc' }, // Verified reviews first
          { createdAt: 'desc' }   // Then by date
        ],
        take: limit,
        skip: offset
      }),
      prisma.review.count({ where: whereClause })
    ]);

    // Calculate review statistics
    const reviewStats = await prisma.review.aggregate({
      where: {
        consultantId: consultant.id,
        status: 'APPROVED',
        isPublic: true
      },
      _avg: { rating: true },
      _count: { rating: true }
    });

    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        consultantId: consultant.id,
        status: 'APPROVED',
        isPublic: true
      },
      _count: { rating: true },
      orderBy: { rating: 'desc' }
    });

    logger.info('✅ Reviews fetched successfully', {
      consultantSlug: slug,
      reviewCount: reviews.length,
      totalCount,
      averageRating: reviewStats._avg.rating
    });

    return res.json({
      message: 'Reviews retrieved successfully',
      data: {
        reviews,
        pagination: {
          totalCount,
          limit,
          offset,
          hasMore: totalCount > offset + limit
        },
        statistics: {
          totalReviews: reviewStats._count.rating || 0,
          averageRating: reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : 0,
          ratingDistribution: ratingDistribution.reduce((acc, item) => {
            acc[item.rating] = item._count.rating;
            return acc;
          }, {} as Record<number, number>)
        },
        consultant: {
          name: `${consultant.firstName} ${consultant.lastName}`,
          slug
        }
      }
    });

  } catch (error: any) {
    logger.error('❌ Error fetching reviews:', error);
    return res.status(500).json({
      message: 'Failed to fetch reviews',
      code: 'REVIEW_FETCH_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/reviews/consultant/:slug/summary
 * Get review summary statistics for a consultant (public endpoint)
 */
router.get('/consultant/:slug/summary', async (req, res) => {
  try {
    const { slug } = req.params;

    logger.info('📊 Fetching review summary for consultant', { slug });

    // Find consultant by slug
    const consultant = await prisma.consultant.findUnique({
      where: { slug },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!consultant) {
      return res.status(404).json({
        message: 'Consultant not found',
        code: 'CONSULTANT_NOT_FOUND'
      });
    }

    // Get review statistics
    const [reviewStats, ratingDistribution, recentReviews] = await Promise.all([
      prisma.review.aggregate({
        where: {
          consultantId: consultant.id,
          status: 'APPROVED',
          isPublic: true
        },
        _avg: { rating: true },
        _count: { rating: true }
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          consultantId: consultant.id,
          status: 'APPROVED',
          isPublic: true
        },
        _count: { rating: true },
        orderBy: { rating: 'desc' }
      }),
      prisma.review.findMany({
        where: {
          consultantId: consultant.id,
          status: 'APPROVED',
          isPublic: true
        },
        select: {
          id: true,
          reviewerName: true,
          rating: true,
          reviewText: true,
          title: true,
          isVerified: true,
          createdAt: true
        },
        orderBy: [
          { isVerified: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 3 // Latest 3 reviews for preview
      })
    ]);

    const summary = {
      totalReviews: reviewStats._count.rating || 0,
      averageRating: reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[item.rating] = item._count.rating;
        return acc;
      }, {} as Record<number, number>),
      recentReviews,
      consultant: {
        name: `${consultant.firstName} ${consultant.lastName}`,
        slug
      }
    };

    logger.info('✅ Review summary fetched successfully', {
      consultantSlug: slug,
      totalReviews: summary.totalReviews,
      averageRating: summary.averageRating
    });

    return res.json({
      message: 'Review summary retrieved successfully',
      data: summary
    });

  } catch (error: any) {
    logger.error('❌ Error fetching review summary:', error);
    return res.status(500).json({
      message: 'Failed to fetch review summary',
      code: 'REVIEW_SUMMARY_ERROR',
      details: error.message
    });
  }
});

export default router;