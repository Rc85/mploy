const app = require('express').Router();
const db = require('../db');
const error = require('../utils/error-handler');
const stripe = require('stripe')(process.env.NODE_ENV === 'development' ? process.env.DEV_STRIPE_API_KEY : process.env.STRIPE_API_KEY)

app.post('/api/get/user', async(req, resp) => {
    db.connect((err, client, done) => {
        if (err) error.log({name: err.name, message: err.message, origin: 'Database Connection', url: '/'});

        (async() => {
            try {
                await client.query('BEGIN');

                let listed = await client.query(`SELECT listing_user FROM user_listings WHERE listing_user = $1 AND listing_status = 'Active'`, [req.body.username]);

                if (listed && listed.rows.length === 1) {
                    let user = await client.query(`SELECT users.username, users.user_email, users.user_last_login, user_profiles.*, user_settings.*, user_listings.* FROM users
                    LEFT JOIN user_profiles ON user_profiles.user_profile_id = users.user_id
                    LEFT JOIN user_settings ON user_settings.user_setting_id = users.user_id
                    LEFT JOIN user_listings ON users.username = user_listings.listing_user
                    WHERE users.username = $1 AND users.user_status = 'Active' AND user_listings.listing_status = 'Active'`, [req.body.username]);

                    if (user && user.rows.length === 1) {
                        delete user.rows[0].user_profile_id;

                        if (user.rows[0].hide_email === true) {
                            delete user.rows[0].user_email;
                        }

                        if (!user.rows[0].display_fullname) {
                            delete user.rows[0].user_firstname;
                            delete user.rows[0].user_lastname;
                        }

                        delete user.rows[0].hide_email;
                        delete user.rows[0].display_fullname;
                        delete user.rows[0].email_notifications;
                        delete user.rows[0].user_setting_id;
                        
                        let orderby = '';
                        let reviewsParam, reports, reportedUser;
                        let userIsReported = false;
                        let reportedReviews = [];
                        let businessHours = {};
                        
                        if (user.rows[0].display_business_hours) {
                            businessHoursQuery = await client.query(`SELECT * FROM business_hours WHERE business_owner = $1`, [req.body.username]);

                            if (businessHoursQuery.rows.length === 1) {
                                delete businessHoursQuery.rows[0].business_hour_id;
                                delete businessHoursQuery.rows[0].business_owner;

                                businessHours = businessHoursQuery.rows[0];
                            }
                        }

                        if (req.session.user) {
                            orderby = 'user_reviews.reviewer = $2 DESC, ';
                            reviewsParam = [req.body.username, req.session.user.username];
                            reports = await client.query(`SELECT reported_id FROM reports WHERE reporter = $1 AND report_type = $2 AND report_status = 'Pending'`, [req.session.user.username, 'Review']);
                            reportedUser = await client.query(`SELECT reported_id FROM reports WHERE reporter = $1 AND report_type = $2 AND reported_user = $3 AND report_status = 'Pending'`, [req.session.user.username, 'User', req.body.username]);


                            for (let report of reports.rows) {
                                reportedReviews.push(report.reported_id);
                            }

                            if (reportedUser && reportedUser.rows.length === 1) {
                                userIsReported = true;
                            }
                        } else {
                            reviewsParam = [req.body.username];
                        }

                        let reviews = await client.query(`SELECT user_reviews.*, user_profiles.avatar_url, jobs.job_client, jobs.job_user FROM user_reviews
                        LEFT JOIN users ON users.username = user_reviews.reviewer
                        LEFT JOIN user_profiles ON users.user_id = user_profiles.user_profile_id
                        LEFT JOIN jobs ON user_reviews.review_job_id = jobs.job_id
                        WHERE user_reviews.reviewing = $1 AND user_reviews.review IS NOT NULL AND user_reviews.review_status = 'Active'
                        ORDER BY ${orderby}user_reviews.review_date DESC`, reviewsParam);

                        let stats = await client.query(`SELECT
                            (SELECT COUNT(job_id) AS job_complete FROM jobs WHERE job_stage = 'Completed'),
                            (SELECT COUNT(job_id) AS job_abandon FROM jobs WHERE job_stage = 'Abandoned'),
                            (SELECT (SUM(review_rating) / COUNT(review_id)) AS rating FROM user_reviews WHERE reviewing = $1 AND review_rating IS NOT NULL),
                            (SELECT COUNT(review_id) AS job_count FROM user_reviews WHERE review IS NOT NULL AND reviewing = $1 AND review_status = 'Active'),
                            user_view_count.view_count,
                            users.user_last_login FROM users
                        LEFT JOIN user_reviews ON users.username = user_reviews.reviewing
                        LEFT JOIN user_view_count ON user_view_count.viewing_user = users.username
                        LEFT JOIN jobs ON jobs.job_id = user_reviews.review_job_id
                        WHERE username = $1
                        LIMIT 1;`, [req.body.username]);

                        let isFriend = await client.query(`SELECT * FROM friends WHERE friend_user_1 = $1 AND friend_user_2 = $2`, [req.session.user.username, req.body.username]);

                        await client.query(`INSERT INTO user_view_count (viewing_user, view_count) VALUES ($1, $2) ON CONFLICT (viewing_user) DO UPDATE SET view_count = user_view_count.view_count + 1`, [req.body.username, 1]);

                        await client.query('COMMIT')
                        .then(() =>  resp.send({status: 'success', user: user.rows[0], reviews: reviews.rows, stats: stats.rows[0], hours: businessHours, reports: reportedReviews, userReported: userIsReported, isFriend: isFriend.rows.length === 1 ? true : false}));
                    }
                } else {
                    let error = new Error(`That user is not listed`);
                    error.type = 'CUSTOM';
                    error.status = 'access error';
                    throw error;
                }
            } catch (e) {
                await client.query('ROLLBACK');
                throw e
            } finally {
                done();
            }
        })()
        .catch(err => {
            error.log({name: err.name, message: err.message, origin: 'Database Query', url: req.url});

            let message = 'An error occurred';
            let errorStatus = 'error';
            
            if (err.type === 'CUSTOM') {
                message = err.message;
                errorStatus = err.status;
            }

            resp.send({status: errorStatus, statusMessage: message});
        });
    });
});

app.get('/api/get/business_hours', async(req, resp) => {
    if (req.session.user) {
        await db.query(`SELECT monday, tuesday, wednesday, thursday, friday, saturday, sunday FROM business_hours WHERE business_owner = $1`, [req.session.user.username])
        .then(result => {
            if (result) resp.send({status: 'success', hours: result.rows[0]});
        })
        .catch(err => {
            error.log({name: err.name, message: err.message, origin: 'Database Query', url: req.url});
            resp.send({status: 'error', statusMessage: 'An error occurred'});
        });
    } else {
        resp.send({status: 'error', statusMessage: `You're not logged in`});
    }
});

app.get('/api/get/user/notification-and-message-count', async(req, resp) => {
    if (req.session.user) {
        let notifications = await db.query(`SELECT COUNT(notification_id) AS notification_count FROM notifications WHERE notification_recipient = $1 AND notification_status = 'New'`, [req.session.user.username]);

        let messages = await db.query(`SELECT
            (
                SELECT COUNT(message_id) AS unread_inquiries FROM messages
                LEFT JOIN jobs ON messages.belongs_to_job = jobs.job_id
                WHERE jobs.job_stage = 'Inquire'
                AND messages.message_status = 'New'
                AND (messages.message_recipient = $1)
            ),
            (
                SELECT COUNT(message_id) AS unread_active FROM messages
                LEFT JOIN jobs ON messages.belongs_to_job = jobs.job_id
                WHERE jobs.job_stage = 'Active'
                AND messages.message_status = 'New'
                AND (messages.message_recipient = $1)
            ),
            (
                SELECT COUNT(message_id) AS unread_completed FROM messages
                LEFT JOIN jobs ON messages.belongs_to_job = jobs.job_id
                WHERE jobs.job_stage = 'Completed'
                AND messages.message_status = 'New'
                AND (messages.message_recipient = $1)
            ),
            (
                SELECT COUNT(message_id) AS unread_abandoned FROM messages
                LEFT JOIN jobs ON messages.belongs_to_job = jobs.job_id
                WHERE jobs.job_stage = 'Abandoned'
                AND messages.message_status = 'New'
                AND (messages.message_recipient = $1)
            )
        FROM users WHERE username = $1`, [req.session.user.username]);

        if (notifications && messages) {
            resp.send({status: 'success', notifications: notifications.rows[0].notification_count, messages: messages.rows[0]});
        } else {
            resp.send({status: 'error', statusMessage: 'An error occurred'});
        }
    } else {
        resp.send('done');
    }
});

app.post('/api/get/user/notifications', async(req, resp) => {
    if (req.session.user) {
        let queryString;

        if (req.body.new) {
            queryString = `SELECT * FROM notifications WHERE notification_recipient = $1 AND notification_status = 'New' ORDER BY notification_date DESC OFFSET $2`;
        } else {
            queryString = `SELECT * FROM notifications WHERE notification_recipient = $1 ORDER BY notification_date DESC OFFSET $2 LIMIT 20`;
        }

        await db.query(queryString, [req.session.user.username, req.body.offset])
        .then(async result => {
            if (result) {
                resp.send({status: 'success', notifications: result.rows});
            }
        })
        .catch(err => {
            error.log({name: err.name, message: err.message, origin: 'Database Query', url: '/api/get/user/notifications'});
            resp.send({status: 'error', statusMessage: 'An error occurred'});
        });
    } else {
        resp.send('done');
    }
});

app.post('/api/get/payments', async(req, resp) => {
    if (req.session.user) {
        let user = await db.query(`SELECT stripe_cust_id FROM users WHERE username = $1`, [req.session.user.username])

        if (user && user.rows[0].stripe_cust_id) {
            stripe.customers.retrieve(user.rows[0].stripe_cust_id, (err, customer) => {
                if (err) {
                    error.log({name: err.name, message: err.message, origin: `Retrieiving customer's payments`, url: req.url});
                    resp.send({status: 'error', statusMessage: 'An error occurred'});
                }

                resp.send({status: 'success', defaultSource: customer.default_source, payments: customer.sources.data});
            });
        } else {
            resp.send({status: 'success', payments: []});
        }
    }
});

app.post('/api/get/user/subscription', async(req, resp) => {
    if (req.session.user) {
        let user = await db.query(`SELECT subscription_id, subscription_end_date FROM users WHERE username = $1`, [req.session.user.username]);
        let now = new Date();

        if (user && user.rows[0].subscription_end_date > now) {
            await stripe.subscriptions.retrieve(user.rows[0].subscription_id)
            .then(subscription => {
                resp.send({status: 'success', subscription: subscription});
            })
            .catch(err => {
                error.log({name: err.name, message: err.message, origin: `Retrieving customer's subscription`, url: req.url});
                resp.send({status: 'error', statusMessage: 'An error occurred'});
            });
        } else {
            resp.send('done');
        }
    } else {
        resp.send({status: 'error', statusMessage: `You're not logged in`});
    }
});

app.post('/api/get/user/activities', (req, resp) => {
    if (req.session.user) {
        db.connect((err, client, done) => {
            if (err) error.log({name: err.name, message: err.message, origin: 'Database Connection', url: '/'});

            (async() => {
                try {
                    await client.query('BEGIN');

                    let notifications = [];
                    let activities = [];

                    let notificationCount = await client.query(`SELECT COUNT(notification_id) AS notification_count FROM notifications WHERE notification_recipient = $1`, [req.session.user.username]);
                    let activityCount = await client.query(`SELECT COUNT(activity_id) AS activity_count FROM activities WHERE activity_user = $1`, [req.session.user.username]);

                    if (req.body.request.type === 'all' || req.body.request.type === 'notifications') {
                        notifications = await client.query(`SELECT * FROM notifications WHERE notification_recipient = $1 ORDER BY notification_date DESC LIMIT 5 OFFSET $2`, [req.session.user.username, req.body.request.offset]);
                    }

                    if (req.body.request.type === 'all' || req.body.request.type === 'activities') {
                        activities = await client.query(`SELECT * FROM activities WHERE activity_user = $1 ORDER BY activity_date DESC LIMIT 5 OFFSET $2`, [req.session.user.username, req.body.request.offset]);
                    }

                    await client.query('COMMIT')
                    .then(() => resp.send({status: 'success', notifications: notifications.rows, activities: activities.rows, activityCount: activityCount.rows[0].activity_count, notificationCount: notificationCount.rows[0].notification_count}));
                    
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    done();
                }
            })()
            .catch(err => {
                error.log({name: err.name, message: err.message, origin: 'Getting user activities', url: req.url});
                resp.send({status: 'error', statusMessage: 'An error occurred'});
            });
        });
    }
});

app.post('/api/user/get/friends', async(req, resp) => {
    if (req.session.user) {
        await db.query(`SELECT friends.*, users.user_email, users.user_last_login, user_profiles.*, user_settings.hide_email, user_listings.listing_status FROM friends
        LEFT JOIN users ON friends.friend_user_2 = users.username
        LEFT JOIN user_profiles ON users.user_id = user_profiles.user_profile_id
        LEFT JOIN user_settings ON users.user_id = user_settings.user_setting_id
        LEFT JOIN user_listings ON friends.friend_user_2 = user_listings.listing_user
        WHERE friend_user_1 = $1`, [req.session.user.username])
        .then(result => {
            if (result) {
                for (let friend of result.rows) {
                    if (friend.hide_email) {
                        delete friend.user_email;
                    }

                    delete friend.hide_email;
                }

                resp.send({status: 'success', friends: result.rows});
            } else {
                resp.send({status: 'error', statusMessage: 'Failed to retrieve friends list'});
            }
        })
        .catch(err => {
            console.log(err);
            resp.send({status: 'error', statusMessage: 'An error occurred'});
        });
    }
});

module.exports = app;