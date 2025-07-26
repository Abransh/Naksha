"use strict";
// API Routes for Review Management
// Handles review submission and retrieval for consultant profiles
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("@nakksha/database");
const validation_1 = require("../../middleware/validation");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
// Validation schemas
const createReviewSchema = zod_1.z.object({
    consultantId: zod_1.z.string().cuid(),
    reviewerName: zod_1.z.string().min(1, 'Name is required').max(100),
    reviewerEmail: zod_1.z.string().email().optional(),
    rating: zod_1.z.number().int().min(1).max(5),
    reviewText: zod_1.z.string().min(10, 'Review must be at least 10 characters').max(1000),
    title: zod_1.z.string().max(100).optional(),
    sessionId: zod_1.z.string().cuid().optional(),
});
const getReviewsQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SPAM']).optional(),
    rating: zod_1.z.string().transform(Number).optional(),
    limit: zod_1.z.string().transform(Number).default('10'),
    offset: zod_1.z.string().transform(Number).default('0'),
});
/**
 * POST /api/v1/reviews
 * Submit a new review for a consultant
 */
router.post('/', (0, validation_1.validateRequest)(createReviewSchema), async (req, res) => {
    try {
        let { consultantId, reviewerName, reviewerEmail, rating, reviewText, title, sessionId } = req.body;
        logger_1.logger.info('📝 Creating new review', {
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
            consultant = await database_1.prisma.consultant.findUnique({
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
        }
        else {
            // Verify consultant exists by ID
            consultant = await database_1.prisma.consultant.findUnique({
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
            const session = await database_1.prisma.session.findFirst({
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
        const review = await database_1.prisma.review.create({
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
        logger_1.logger.info('✅ Review created successfully', {
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
    }
    catch (error) {
        logger_1.logger.error('❌ Error creating review:', error);
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
router.get('/consultant/:slug', (0, validation_1.validateRequest)(getReviewsQuerySchema, 'query'), async (req, res) => {
    try {
        const { slug } = req.params;
        const { status = 'APPROVED', rating, limit, offset } = req.query;
        logger_1.logger.info('📖 Fetching reviews for consultant', { slug, status, rating, limit, offset });
        // Find consultant by slug
        const consultant = await database_1.prisma.consultant.findUnique({
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
        const whereClause = {
            consultantId: consultant.id,
            status,
            isPublic: true
        };
        if (rating) {
            whereClause.rating = rating;
        }
        // Get reviews with pagination
        const [reviews, totalCount] = await Promise.all([
            database_1.prisma.review.findMany({
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
                    { createdAt: 'desc' } // Then by date
                ],
                take: limit,
                skip: offset
            }),
            database_1.prisma.review.count({ where: whereClause })
        ]);
        // Calculate review statistics
        const reviewStats = await database_1.prisma.review.aggregate({
            where: {
                consultantId: consultant.id,
                status: 'APPROVED',
                isPublic: true
            },
            _avg: { rating: true },
            _count: { rating: true }
        });
        // Get rating distribution
        const ratingDistribution = await database_1.prisma.review.groupBy({
            by: ['rating'],
            where: {
                consultantId: consultant.id,
                status: 'APPROVED',
                isPublic: true
            },
            _count: { rating: true },
            orderBy: { rating: 'desc' }
        });
        logger_1.logger.info('✅ Reviews fetched successfully', {
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
                    }, {})
                },
                consultant: {
                    name: `${consultant.firstName} ${consultant.lastName}`,
                    slug
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error fetching reviews:', error);
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
        logger_1.logger.info('📊 Fetching review summary for consultant', { slug });
        // Find consultant by slug
        const consultant = await database_1.prisma.consultant.findUnique({
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
            database_1.prisma.review.aggregate({
                where: {
                    consultantId: consultant.id,
                    status: 'APPROVED',
                    isPublic: true
                },
                _avg: { rating: true },
                _count: { rating: true }
            }),
            database_1.prisma.review.groupBy({
                by: ['rating'],
                where: {
                    consultantId: consultant.id,
                    status: 'APPROVED',
                    isPublic: true
                },
                _count: { rating: true },
                orderBy: { rating: 'desc' }
            }),
            database_1.prisma.review.findMany({
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
            }, {}),
            recentReviews,
            consultant: {
                name: `${consultant.firstName} ${consultant.lastName}`,
                slug
            }
        };
        logger_1.logger.info('✅ Review summary fetched successfully', {
            consultantSlug: slug,
            totalReviews: summary.totalReviews,
            averageRating: summary.averageRating
        });
        return res.json({
            message: 'Review summary retrieved successfully',
            data: summary
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error fetching review summary:', error);
        return res.status(500).json({
            message: 'Failed to fetch review summary',
            code: 'REVIEW_SUMMARY_ERROR',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=reviews.js.map