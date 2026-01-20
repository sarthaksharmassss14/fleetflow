import rateLimit from 'express-rate-limit';

/**
 * Gemini AI Specific Rate Limiter
 * 1000 requests per day limit
 * We apply this to routes that trigger AI generations
 */
export const aiRateLimiter = rateLimit({
	windowMs: 24 * 60 * 60 * 1000, // 24 hours
	max: 1000, // Limit each IP to 1000 requests per windowMs
	message: {
		status: 429,
		message: "⚠️ AI Daily Quota Exceeded. Gemini AI is limited to 1000 optimizations per day. Please try again tomorrow or contact admin."
	},
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * General API Rate Limiter
 * Prevents brute force and spamming
 */
export const apiRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: {
		status: 429,
		message: "Too many requests from this IP, please try again after 15 minutes."
	},
	standardHeaders: true,
	legacyHeaders: false,
});
