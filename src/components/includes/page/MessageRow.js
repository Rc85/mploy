import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import ReviewButton from '../../utils/ReviewButton';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { Alert } from '../../../actions/AlertActions';
import Loading from '../../utils/Loading';
import fetch from 'axios';
import SubmitReview from './SubmitReview';
import { connect } from 'react-redux';

class MessageRow extends Component {
    constructor(props) {
        super(props);
        
        this.state = {
            review: false,
            status: '',
            star: 0,
            starActive: 0,
            notReviewed: this.props.message.token_status && this.props.message.token_status === 'Valid'
        }
    }

    submit(review, message, star) {
        this.setState({status: 'Sending'});

        fetch.post('/api/user/review/submit', {review: review, message, star: star})
        .then(resp => {
            console.log(resp.data.status);
            let notReviewed = true;
            
            if (resp.data.status === 'success') {
                notReviewed = false;
            }

            this.setState({status: '', review: false, notReviewed: notReviewed});
            
            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => console.log(err));
    }
    
    render() {
        console.log(this.props.message)
        let statusButton, statusButtonClass, reviewButton, review, status;

        if (this.state.status === 'Sending') {
            status = <Loading size='5x' />;
        }

        if (this.props.message.job_status) {
            if (this.props.message.job_status === 'Closed' || this.props.message.job_status === 'Abandoned') {
                statusButtonClass = 'danger';
            } else if (this.props.message.job_status === 'Incomplete' || this.props.message.job_status === 'Abandoning') {
                statusButtonClass = 'warning';
            } else if (this.props.message.job_status === 'Complete') {
                statusButtonClass = 'success';

                if (this.state.notReviewed) {
                    reviewButton = <ReviewButton review={() => this.setState({review: true})}/>;
                } else {
                    reviewButton = <ReviewButton reviewed />;
                }
            }

            if (this.props.message.job_status !== 'Active') {
                statusButton = <span className={`badge badge-${statusButtonClass}`}>{this.props.message.job_status}</span>;
            }
        }

        if (this.state.review) {
            review = <SubmitReview submit={(review, star) => this.submit(review, this.props.message, star)} cancel={() => this.setState({review: false})} user={this.props.user} message={this.props.message} />;
        }

        return(
            <React.Fragment>
                <div className='d-flex-between-start mb-3'>
                    {status}
                    <div className='w-5'><input type='checkbox' name='select-message' id={this.props.message.job_id} className='select-message-checkbox' onChange={(e) => this.props.select(e.target.value)}/></div>
                    <div className='w-5'>{this.props.message.job_id}</div>
                    <div className='w-70'>
                        <div className='user-message-subject'><NavLink to={`/dashboard/message/${this.props.stage}/${this.props.message.job_id}/details`}>{this.props.message.job_subject}</NavLink> {this.props.message.job_user === this.props.user.username && this.props.message.job_is_new ? <span className='badge badge-success'>New</span> : ''}</div>
    
                        <div><small>{this.props.message.message_sender === this.props.user.username ? <span>Sent {moment(this.props.message.message_date).fromNow()} to <NavLink to={`/user/${this.props.message.message_recipient}`}>{this.props.message.message_recipient}</NavLink></span> : <span>Received {moment(this.props.message.message_date).fromNow()} from <NavLink to={`/user/${this.props.message.message_sender}`}>{this.props.message.message_sender}</NavLink></span>}</small></div>
                    </div>
                    <div className='w-10'>{statusButton}</div>
                    <div className='w-10 d-flex-end-center'>
                        {reviewButton}
                        <button className='btn btn-secondary btn-sm' onClick={() => this.props.delete()}><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                </div>
                {review}
            </React.Fragment>
        )
    }
}

MessageRow.propTypes = {
    user: PropTypes.object,
    stage: PropTypes.string,
    message: PropTypes.object,
    select: PropTypes.func,
    delete: PropTypes.func
}

export default connect()(MessageRow);