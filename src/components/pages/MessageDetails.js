import React, { Component } from 'react';
import Loading from '../utils/Loading';
import MessageSender from '../includes/page/MessageSender';
import { Alert } from '../../actions/AlertActions';
import OfferSender from '../includes/page/OfferSender';
import Response from '../pages/Response';
import OfferDetails from '../includes/page/OfferDetails';
import MessageRow from '../includes/page/MessageRow';
import { withRouter, Redirect } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandHoldingUsd, faInfoCircle, faCheck, faBan, faMinusCircle, faReply, faTimes, faRedoAlt } from '@fortawesome/free-solid-svg-icons';
import { connect } from 'react-redux';
import { ShowConfirmation, ResetConfirmation } from '../../actions/ConfirmationActions';
import fetch from 'axios';
import moment from 'moment';
import { PromptOpen, PromptReset } from '../../actions/PromptActions';
import { LogError } from '../utils/LogError';
import TitledContainer from '../utils/TitledContainer';
import Tooltip from '../utils/Tooltip';

class MessageDetails extends Component {
    constructor(props) {
        super(props);
        
        this.state = {
            status: '',
            statusMessage: '',
            messages: this.props.job.messages,
            messageCount: parseInt(this.props.job.messages[0].message_count),
            listingDetails: false,
            send: false,
            makeOffer: false,
            offset: 0,
            fetchStatus: '',
            confirmAccept: false,
            reason: '',
            showOfferDetail: this.props.job.job && this.props.job.job.job_stage === 'Inquire' ? true : false
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.confirm.data && nextProps.confirm.option) {
            if (nextProps.confirm.data.action === 'accept offer') {
                this.acceptOffer();
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'decline offer') {
                this.declineOffer();
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'close inquiry') {
                this.closeInquiry();
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'user complete job') {
                this.completeJob();
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'client complete job') {
                this.approveCompleteJob();
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'decline job complete') {
                this.declineCompleteJob(nextProps.confirm.data.message);
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'abandon job') {
                this.abandonJob(this.state.reason);
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'cancel abandon') {
                this.cancelAbandon();
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'client agree abandon') {
                this.confirmAbandon('approve');
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'client disagree abandon') {
                this.confirmAbandon('decline');
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'hire') {
                this.submitOffer({type: 'hire'});
                this.props.dispatch(ResetConfirmation());
            }

            if (nextProps.confirm.data.action === 'send offer') {
                this.submitOffer(nextProps.confirm.data.data);
                this.props.dispatch(ResetConfirmation());
            }
        }

        if (nextProps.prompt.text === '' && nextProps.prompt.data && nextProps.prompt.input) {
            if (nextProps.prompt.data.action === 'abandon job') {
                this.abandonJob(nextProps.prompt.input)
                this.props.dispatch(PromptReset());
            }
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.job.messages[0].message_date !== this.props.job.messages[0].message_date) {
            this.setState({messages: this.props.job.messages});
        }

        if (prevState.offset !== this.state.offset) {
            let offset = 0;

            if (prevState.offset !== this.state.offset) {
                offset = this.state.offset;
            }

            fetch.post('/api/get/message', {job_id: this.props.job.job.job_id, offset: offset, stage: this.props.job.job.job_stage})
            .then(resp => {
                if (resp.data.status === 'success') {
                    let messages = [...this.state.messages];

                    messages.push(...resp.data.messages);

                    this.setState({status: '', messages: messages, fetchStatus: ''});
                } else if (resp.status === 'access error') {
                    this.setState({status: resp.data.status, statusMessage: resp.data.statusMessage})
                }
            })
            .catch(err => LogError(err, '/api/get/message'));
        }
    }

    send(message) {
        let recipient;

        if (this.props.user.user.username === this.props.job.job.job_user) {
            recipient = this.props.job.job.job_client;
        } else {
            recipient = this.props.job.job.job_user;
        }

        this.setState({status: 'Sending'});

        fetch.post('/api/message/reply', {
            recipient: recipient,
            message: message,
            job_id: this.props.job.job.job_id
        })
        .then(resp => {
            let messages = [...this.state.messages];
            
            if (resp.data.reply) {
                messages.unshift(resp.data.reply);
            }

            this.setState({status: '', messages: messages, send: false});

            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => LogError(err, '/api/message/reply'));
    }

    submitOffer(data) {
        let url;

        if (this.props.job.offer) {
            url = '/api/offer/edit';
            data['offer_id'] = this.props.job.offer.offer_id;
        } else {
            url = '/api/offer/submit';
        }

        if (!data.type) {
            data['type'] = 'offer';
        }

        data['job_id'] = this.props.job.job.job_id;

        this.setState({status: 'Sending'});

        fetch.post(url, data)
        .then(resp => {
            let messages = [...this.state.messages];

            if (resp.data.message) {
                messages.unshift(resp.data.message);
            }

            this.props.refresh(this.props.job.job.job_id);

            this.setState({status: '', makeOffer: false, messages: messages, offer: resp.data.offer});

            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => LogError(err, url));
    }

    deleteOffer() {
        this.setState({status: 'Sending'});

        fetch.post('/api/offer/delete', {job_id: this.props.job.job.job_id, offer_id: this.props.job.offer.offer_id})
        .then(resp => {
            let messages = [...this.state.messages];
            
            if (resp.data.message) {
                messages.unshift(resp.data.message);
            }    

            this.setState({status: '', messages: messages, makeOffer: false, offer: null});

            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => LogError(err, '/api/offer/delete'));
    }

    acceptOffer() {
        this.setState({status: 'Sending'});

        fetch.post('/api/offer/accept', {job_id: this.props.job.job.job_id, offer_id: this.props.job.offer.offer_id})
        .then(resp => {
            if (resp.data.status === 'offer accepted') {
                this.props.removeJob('offer accepted');
                this.setState({status: resp.data.status});
            } else {
                this.setState({status: ''})

                this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
            }
        })
        .catch(err => LogError(err, '/api/offer/accept'));
    }

    declineOffer() {
        this.setState({status: 'Sending'});

        fetch.post('/api/offer/decline', {job_id: this.props.job.job.job_id, offer_id: this.props.job.offer.offer_id})
        .then(resp => {
            if (resp.data.status === 'success') {
                let messages = [...this.state.messages];

                messages.unshift(resp.data.message);

                this.props.refresh(this.props.job.job.job_id);
                this.setState({status: 'offer declined', offer: null});
            } else {
                this.setState({status: ''})

                this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
            } 
        })
        .catch(err => LogError(err, '/api/offer/decline'));
    }

    closeInquiry() {
        this.setState({status: 'Sending'});

        fetch.post('/api/job/close', {job_id: this.props.job.job.job_id})
        .then(resp => {
            if (resp.data.status === 'success') {
                this.props.removeJob('job close');
                this.setState({status: '', job: resp.data.job});
            } else if (resp.data.status === 'error') {
                this.setState({status: ''});

                this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
            }
        })
        .catch(err => LogError(err, '/api/job/close'));
    }

    completeJob() {
        this.setState({status: 'Sending'});

        fetch.post('/api/job/complete', {job_id: this.props.job.job.job_id, recipient: this.props.job.job.job_client})
        .then(resp => {
            if (resp.data.status === 'success') {
                let messages = [...this.state.messages];

                if (resp.data.message) {
                    messages.unshift(resp.data.message);
                }

                this.setState({status: '', messages: messages, job: resp.data.job});
            } else if (resp.data.status === 'error') {
                this.setState({status: ''});
            }  
            
            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => LogError(err, '/api/job/complete'));
    }

    approveCompleteJob() {
        this.setState({status: 'Sending'});

        fetch.post('/api/job/complete/approve', {job_id: this.props.job.job.job_id, recipient: this.props.job.job.job_user})
        .then(resp => {
            if (resp.data.status === 'job complete') {
                this.props.removeJob('job complete');
                this.setState({status: resp.data.status});
            } else {
                this.setState({status: ''});

                this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
            }
        })
        .catch(err => LogError(err, '/api/job/complete/approve'));
    }

    declineCompleteJob(message) {
        this.setState({status: 'Sending'});

        fetch.post('/api/job/complete/decline', {job_id: this.props.job.job.job_id, message: message, recipient: this.props.job.job.job_user})
        .then(resp => {
            if (resp.data.status === 'success') {
                this.setState({status: '', job: resp.data.job});
            } else if (resp.data.status === 'error') {
                this.setState({status: ''});
            }  
            
            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => LogError(err, '/api/job/complete/decline'));
    }

    abandonJob(reason) {
        this.setState({status: 'Sending'});

        fetch.post('/api/job/abandon', {job_id: this.props.job.job.job_id, recipient: this.props.job.job.job_client, reason: reason})
        .then(resp => {
            if (resp.data.status === 'success') {
                let messages = [...this.state.messages];

                if (resp.data.message) {
                    messages.unshift(resp.data.message);
                }

                this.props.refresh(resp.data.job.job_id);

                this.setState({status: '', messages: messages, job: resp.data.job});
            } else if (resp.data.status === 'error') {
                this.setState({status: ''});
            }     

            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => LogError(err, '/api/job/abandon'));
    }

    cancelAbandon() {
        this.setState({status: 'Sending'});

        fetch.post('/api/job/cancel-abandon', {job_id: this.props.job.job.job_id, recipient: this.props.job.job.job_client})
        .then(resp => {
            if (resp.data.status === 'success') {
                let messages = [...this.state.messages];
                messages.unshift(resp.data.message);

                this.props.refresh(resp.data.job.job_id);

                this.setState({status: '', messages: messages, job: resp.data.job});
            } else if (resp.data.status === 'error') {
                this.setState({status: ''});
            }

            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => LogError(err, '/api/job/cancel-abandon'));
    }

    confirmAbandon(decision) {
        this.setState({status: 'Sending'});

        fetch.post(`/api/job/abandon/${decision}`, {job_id: this.props.job.job.job_id})
        .then(resp => {
            if (resp.data.status === 'success') {
                this.props.removeJob(`${decision} abandon`);
                this.setState({status: '', job: resp.data.job});
            } else if (resp.data.status === 'error') {
                this.setState({status: ''});

                this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
            }   
        })
        .catch(err => LogError(err, `/api/job/abandon/${decision}`));
    }

    render() {
        let sendButton, sendMessage, sendStatus, messages, offerConfirmation, fetchStatus, offerButton, confirmation, closeButton, completeButton, incompleteButton, reasonInput, jobStatus, abandonedDate, refreshButton, status;
        let now = moment();

        if (this.props.status === 'Loading Message') {
            status = <Loading size='5x' color='black' />;
        }

        if (this.props.job.job && this.props.user.user) {
            abandonedDate = moment(this.props.job.job.job_abandoned_date);


            if (abandonedDate) {
                if (abandonedDate.diff(now, 'weeks') >= 3 || this.props.job.job.job_status === 'Abandoned') {
                    jobStatus = <span className='med-badge mini-badge-danger'>Abandoned</span>;
                } else if (this.props.job.job.job_status === 'Incomplete') {
                    jobStatus = <span className='med-badge mini-badge-warning'>Incomplete</span>;
                } else if (this.props.job.job.job_status === 'Abandoning') {
                    jobStatus = <span className='med-badge mini-badge-warning'>Abandoning</span>;
                } else if (this.props.job.job.job_status === 'Completed') {
                    jobStatus = <span className='med-badge mini-badge-success'>Complete</span>;
                } else if (this.props.job.job.job_status === 'Closed') {
                    jobStatus = <span className='med-badge mini-badge-danger'>Closed</span>;
                } else if (this.props.job.job.job_status === 'Appealing') {
                    jobStatus = <span className='med-badge mini-badge-warning'>Appealing</span>;
                }
            }

            if (this.state.listingDetails) {
                listingDetails = <div>
                    <div className='row'>
                        <div className='col-3'>
                            <div className='mb-1'><strong>Listed By:</strong></div>
                            {this.props.job.job && !this.props.job.job.listing_negotiable ? <div className='mb-1'><strong>Price Rate:</strong></div> : <div className='mb-1'><strong>Asking Price:</strong></div>}
                            <div className='mb-1'><strong>Job Created:</strong></div>
                        </div>
                        
                        <div className='col-9'>
                            <div className='mb-1'>{this.props.job.job ? this.props.job.job.job_user : ''}</div>
                            <div className='mb-1'>${this.props.job.job.listing_price} / {this.props.job.job.listing_price_type} {this.props.job.job.listing_price_currency}</div>
                            <div className='mb-1'>{this.props.job.job ? moment(this.props.job.job.listing_created_date).fromNow() : ''}</div>
                        </div>
                    </div>
                </div>
            }

            if (this.props.job.job.job_stage === 'Active' && this.props.job.job && this.props.job.job.job_user === this.props.user.user.username) {
                if (this.props.job.job.job_status !== 'Abandoning') {
                    completeButton = <Tooltip text='Request for job complete approval from other party' placement='bottom-right'>
                        <button id='complete-job-button' className={`btn btn-success`} disabled={this.props.job.job.job_user_complete} onClick={() => this.props.dispatch(ShowConfirmation('Send request to complete this job?', false, {action: 'user complete job'}))}>{this.props.job.job.job_user_complete ? <span>{this.props.config.isMobile ? <FontAwesomeIcon icon={faCheck} /> : 'Sent'}</span> : <span>{this.props.config.isMobile ? <FontAwesomeIcon icon={faCheck} /> : 'Complete'}</span>}</button>
                    </Tooltip>;

                    incompleteButton = <Tooltip text='Abandoning a job will negatively impact your reputation' placement='bottom-right'><button id='abandon-job-button' className='btn btn-danger' onClick={() => this.props.dispatch(PromptOpen('Specify a reason to abandon this job', {id: this.props.job.job.job_id, action: 'abandon job'}))}>{this.props.config.isMobile ? <FontAwesomeIcon icon={faBan} /> : 'Abandon'}</button></Tooltip>;
                } else {
                    incompleteButton = <Tooltip text={`You can cancel the abandon request if the other party haven't make a decision yet`} ><button id='abandon-job-button' className='btn btn-warning' onClick={() => this.props.dispatch(ShowConfirmation(`Are you sure you want to cancel the Abandon request?`, false, {action: 'cancel abandon'}))}>{this.props.config.isMobile ? <FontAwesomeIcon icon={faMinusCircle} /> : 'Cancel Abandon'}</button></Tooltip>
                }
            }
            
            if (this.state.fetchStatus === 'Fetching') {
                fetchStatus = <div className='fetch-status'><Loading size='5x' /></div>;
            }

            if (this.props.job.job && (this.props.job.job.job_stage === 'Active' || this.props.job.job.job_stage === 'Inquire')) {
                if (!this.state.send) {
                    sendButton = <button id='message-reply-button' className='btn btn-primary' onClick={() => this.setState({send: true, makeOffer: false})}>{this.props.config.isMobile ? <FontAwesomeIcon icon={faReply} /> : 'Reply'}</button>;
                } else {
                    sendMessage = <MessageSender send={(message) => this.send(message)} cancel={() => this.setState({send: !this.state.send})} status={this.state.status} statusMessage={this.state.statusMessage} subject={this.props.job.job.job_subject} autoFocus={true} />;
                }

                refreshButton = <button className='btn btn-info' onClick={() => this.props.refresh(this.props.job.job.job_id)}>{this.props.config.isMobile ? <FontAwesomeIcon icon={faRedoAlt} /> : 'Refresh'}</button>;
            }

            if (this.state.status === 'Sending') {
                sendStatus = <Loading size='5x' />;
            }

            if (this.props.job.job && this.props.user.user.username !== this.props.job.job.job_user && this.props.job.job.job_stage === 'Inquire') {
                if (this.props.job.job.listing_negotiable) {
                    if (!this.state.makeOffer) {
                        if (this.props.job.job.job_status !== 'Closed') {
                            offerButton = <button id='message-offer-button' className='btn btn-success' onClick={() => this.setState({makeOffer: true, send: false})}>{this.props.job.offer ? 'Edit Offer' : 'Make Offer'}</button>
                        }
                    } else {
                        sendMessage = <TitledContainer title='Make an Offer' bgColor='success' icon={<FontAwesomeIcon icon={faHandHoldingUsd}  />}>
                            <OfferSender offer={this.props.job.offer} submit={(data) => this.props.dispatch(ShowConfirmation(`Are you sure you want to make this offer?`, false, {action: 'send offer', data}))} cancel={() => this.setState({makeOffer: false})} delete={() => this.deleteOffer()}/>
                        </TitledContainer>;
                    }
                } else if (!this.props.job.job.listing_negotiable && !this.props.job.offer) {
                    offerButton = <button id='message-hire-button' className='btn btn-success' onClick={() => this.props.dispatch(ShowConfirmation('Are you sure you want to send a hire request?', false, {action: 'hire'}))}>Hire</button>
                }
            }

            if (this.state.messages) {
                messages = this.state.messages.map((message, i) => {
                    let messageAuthor, messageType, approve, decline;

                    if (message.message_sender !== 'System') {
                        if (message.message_sender === this.props.user.user.username) {
                            messageAuthor = 'owner';
                        } else {
                            messageAuthor = 'sender';
                        }
                    } else {
                        messageAuthor = 'system';
                    }

                    if (message.message_type === 'Confirmation' && this.props.user.user.username === message.message_recipient) {
                        messageType = 'confirmation';
                        approve = () => this.props.dispatch(ShowConfirmation('Proceed to complete this job?', false, {action: 'client complete job'}));
                        decline = () => this.props.dispatch(ShowConfirmation('Are you sure you want to decline the request?', false, {action: 'decline job complete', message: message}));
                    } else if (message.message_type === 'Abandonment' && this.props.user.user.username === message.message_recipient) {
                        messageType = 'abandonment';
                        approve = () => this.props.dispatch(ShowConfirmation('Agree to abandon this job?', false, {action: 'client agree abandon'}))
                        decline = () => this.props.dispatch(ShowConfirmation('Are you sure you want to decline the request to abandon this job?', `This will negatively impact the other party's reputation`, {action: 'client disagree abandon'}))
                    }

                    return <MessageRow key={i} author={messageAuthor} message={message} type={messageType} approve={approve} decline={decline} />;
                });
            }

            if ((this.props.job.offer && this.props.job.job && this.props.job.job.job_user === this.props.user.user.username) || this.props.job.job.job_stage !== 'Inquire') {
                offerConfirmation = <TitledContainer
                id='offer-confirmation'
                title={this.props.stage === 'Inquire' ? 'Offer' : 'Offer Details'}
                bgColor='green'
                icon={this.props.stage === 'Inquire' ? <FontAwesomeIcon icon={faHandHoldingUsd} /> : <FontAwesomeIcon icon={faInfoCircle} />}>
                    <OfferDetails
                    offer={this.props.job.offer}
                    accept={() => this.props.dispatch(ShowConfirmation('Are you sure you want to accept this offer?', false, {action: 'accept offer'}))}
                    stage={this.props.job.job.job_stage}
                    show={this.state.showOfferDetail}
                    toggleOfferDetail={() => this.setState({showOfferDetail: !this.state.showOfferDetail})}
                    decline={() => this.props.dispatch(ShowConfirmation(`Are you sure you want to decline this offer?`, false, {action: 'decline offer'}))} />
                </TitledContainer>;
            }

            if (this.props.job.job && this.props.job.job.job_stage === 'Inquire' && this.props.job.job.job_status !== 'Closed') {
                closeButton = <button id='close-inquiry-button' className='btn btn-danger' onClick={() => this.props.dispatch(ShowConfirmation('Are you sure you want to close this inquiry?', 'No more messages can be sent or received afterwards for this inquiry.', {action: 'close inquiry'}))}>{this.props.config.isMobile ? <FontAwesomeIcon icon={faTimes} /> : 'Close'}</button>
            }
        }

        if (this.state.status === 'fetch error' || this.state.status === 'access error') {
            return <Redirect to='/error/404' />
        } else if (this.state.status === 'offer accepted') {
            return <Response header='Good Job!' message={`The offer was accepted and a job has been created. Keep up the good work!`} />
        } else if (this.state.status === 'job complete') {
            return <Response header='Congratulations!' message={`The job has been successfully completed! Be sure to give the other party a review using the link in the 'Completed' tab.`} />
        } else {
            return(
                <div id='message-details'>
                    {status}
                    {confirmation}
                    <div id='message-header'>
                        <div className='message-header-row'>
                            <small className='text-dark'>Job ID: {this.props.job.job ? this.props.job.job.job_id : ''}</small>
    
                            <div className='message-header-buttons'>
                                {closeButton}
                                {completeButton}
                                {incompleteButton}
                            </div>
                        </div>

                        {offerConfirmation}

                        <div className='message-subject'>
                            <h3>{this.props.job.job ? this.props.job.job.job_subject : ''}</h3>
                            {jobStatus}
                        </div>

                        <div className='message-option-buttons-container'>
                            {offerButton}
                            {sendButton}
                            {refreshButton}
                        </div>


                        <div>
                            {sendStatus}
                            {sendMessage}
                            {reasonInput}
                        </div>

                        <hr/>

                        <div className='messages'>
                            {messages}
                            {this.state.messages.length < parseInt(this.props.job.messages[0].message_count) ? <div className='text-center'><button className='btn btn-primary btn-sm' onClick={() => this.setState({offset: this.state.offset + 10})}>Load more</button></div> : <div className='text-center'><em className='text-dark'>No more messages</em></div>}
                            {fetchStatus}
                        </div>
                    </div>
                </div>
            )
        }
    }
}

const mapStateToProps = state => {
    return {
        confirm: state.Confirmation,
        prompt: state.Prompt,
        user: state.Login,
        config: state.Config
    }
}

export default withRouter(connect(mapStateToProps)(MessageDetails));