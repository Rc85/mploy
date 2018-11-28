const app = require('express').Router();
const db = require('./db');
const error = require('./utils/error-handler');

app.post('/api/filter/listings', async(req, resp) => {
    let whereArray = ['AND listing_sector = $1'];
    let params = [req.body.sector]

    if (req.body.title) {
        params.push(`%${req.body.title}%`);

        let index = params.length;

        whereArray.push(`AND user_title ILIKE $${index}`);
    }

    if (req.body.rating !== 'Any') {
        params.push(req.body.rating);
        let index = params.length;
        whereArray.push(`AND rating = $${index}`);
    }

    if (req.body.price) {
        whereArray.push(`AND listing_price ${req.body.priceOperator} ${req.body.price}`);
        whereArray.push(`AND listing_price_type = '${req.body.priceType}'`);
    }

    if (req.body.completedJobs) {
        let operator;

        // Hard coding operators to prevent SQL injection
        if (req.body.completedJobsOP === '=') {
            operator = '=';
        } else if (req.body.completedJobsOP === '>=') {
            operator = '>=';
        } else if (req.body.completedJobsOP === '>') {
            operator = '>';
        } else if (req.body.completedJobsOP === '<=') {
            operator = '<=';
        } else if (req.body.completedJobsOP === '<') {
            operator = '<';
        }

        params.push(req.body.completedJobs);

        let index = params.length;

        whereArray.push(`AND job_completed ${operator} $${index}`);
    }

    if (req.body.noAbandonedJobs) {
        params.push('0');

        let index = params.length;

        whereArray.push(`AND job_abandoned = $${index}`);
    }

    if (req.body.country) {
        params.push(req.body.country);

        let index = params.length;

        whereArray.push(`AND user_country = $${index}`);
    }

    if (req.body.region) {
        params.push(req.body.region);

        let index = params.length;

        whereArray.push(`AND user_region = $${index}`);
    }

    if (req.body.city) {
        params.push(req.body.city);

        let index = params.length;

        whereArray.push(`AND user_city = $${index}`);
    }

    let queryString = `SELECT user_listings.*, jobs.job_complete, jobs.job_abandoned, user_profiles.user_title, user_reviews.rating FROM user_listings
    LEFT JOIN users ON users.username = user_listings.listing_user
    LEFT JOIN user_profiles ON user_profiles.user_profile_id = users.user_id
    LEFT JOIN
        (SELECT (SUM(review_rating) / COUNT(review_id)) AS rating, reviewing FROM user_reviews GROUP BY reviewing) AS user_reviews
    ON user_reviews.reviewing = user_listings.listing_user
	LEFT JOIN
		(SELECT job_user, (SELECT COUNT(job_status) AS job_complete FROM jobs WHERE job_status = 'Completed'), (SELECT COUNT(job_status) AS job_abandoned FROM jobs WHERE job_status = 'Abandoned') FROM jobs) AS jobs
	ON jobs.job_user = user_listings.listing_user
    WHERE listing_status = 'Active'
    ${whereArray.join(' ')}
    ORDER BY listing_renewed_date DESC, listing_id`;

    await db.query(queryString, params)
    .then(result => {
        if (result) {
            resp.send({status: 'success', listings: result.rows});
        }
    })
    .catch(err => {
        error.log({name: err.name, message: err.message, origin: 'Database Query', url: req.url});
        resp.send({status: 'error', statusMessage: 'An error occurred'});
    });
});

module.exports = app;