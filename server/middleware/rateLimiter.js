import rateLimit from 'express-rate-limit';

/**
 * Gemini AI Specific Rate Limiter
 * 1000 requests per day limit
 * We apply this to routes that trigger AI generations
 */
export const aiRateLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute window (Groq limit is RPM)
	max: 30, // Limit each IP to 30 requests per minute
	message: {
		status: 429,
		message: "⚠️ AI Rate Limit Exceeded. You are making requests too fast (Max 30/min). Please wait a moment."
	},
	standardHeaders: true,
	legacyHeaders: false,

    skipFailedRequests: true // Don't count failed requests against the quota
});

// Secondary Daily Quota Limiter (Optional but good practice)
export const aiDailyLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 14400, // Groq Allow 14,400 RPD. Setting buffer.
    message: { status: 429, message: "⚠️ Daily AI Quota Exceeded (14,000/day)." }
});

/**
 * General API Rate Limiter
 * Prevents brute force and spamming
 */
export const apiRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 2000, // Limit each IP to 2000 requests per windowMs (relaxed for dev/polling)
	message: {
		status: 429,
		message: "Too many requests from this IP, please try again after 15 minutes."
	},
	standardHeaders: true,
	legacyHeaders: false,
});
