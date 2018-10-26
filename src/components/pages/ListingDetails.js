import React, { Component } from 'react';
import { withRouter, NavLink } from 'react-router-dom';
import Loading from '../utils/Loading';
import fetch from 'axios';
import Response from '../pages/Response';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faHeart } from '@fortawesome/free-solid-svg-icons';
import MessageSender from '../includes/page/MessageSender';
import { unsaveListing } from '../utils/Utils';
import { Alert } from '../../actions/AlertActions';
import { connect } from 'react-redux';

class ListingDetails extends Component {
    constructor(props) {
        super(props);

        this.state = {
            listing: null,
            status: 'Loading',
            statusMessage: '',
            listingSaved: false
        }
    }

    componentDidMount() {
        fetch.post('/api/get/listing/detail', {id: this.props.match.params.id})
        .then(resp => {
            if (resp.data.status === 'success') {
                let saved = false;

                if (resp.data.saved) {
                    saved = true;
                }

                this.setState({status: '', listing: resp.data.listing, listingSaved: saved});
            } else if (resp.data.status === 'access error') {
                this.setState({status: resp.data.status, statusMessage: resp.data.statusMessage});
            }
        })
        .catch(err => console.log(err));
    }

    send(message, subject) {
        this.setState({status: 'Sending'});

        fetch.post('/api/message/submit', {subject: subject, message: message, listing: this.state.listing})
        .then(resp => {
            this.setState({status: resp.data.status});

            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => console.log(err));
    }

    saveListing() {
        this.setState({status: 'Sending'});

        fetch.post('/api/listing/save', this.state.listing)
        .then(resp => {
            if (resp.data.status === 'success') {
                this.setState({status: '', listingSaved: true});
            }

            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => console.log(err));
    }

    unsave(id) {
        this.setState({status: 'Sending'});

        unsaveListing(id, resp => {
            if (resp.data.status === 'success') {
                this.setState({status: '', listingSaved: false});
            } else {
                this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
            }
        });
    }

    render() {
        let inquire, status;

        if (this.props.user.user && this.state.listing && this.props.user.user.username !== this.state.listing.listing_user && this.state.listing.allow_messaging) {
            inquire = <div>
                <MessageSender send={(message, subject) => this.send(message, subject)} status={this.state.status} />
            </div>
        }

        if (this.state.status === 'Sending') {
            status = <Loading size='5x' />;
        }

        if (this.state.status === 'access error') {
            return(
                <Response code={500} header='Internal Server Error' message={this.state.statusMessage} />
            )
        } else if (this.state.status === 'Loading') {
            return(
                <Loading size='7x' />
            )
        } else {
            return(
                <section id='service-details' className='main-panel w-100'>
                    {status}
                    <div className='blue-panel shallow rounded w-100 position-relative'>
                        <div className='service-details-header'>
                            <div>
                                <h2>{this.state.listing.listing_title}</h2>
                                <NavLink to={`/user/${this.state.listing.listing_user}`}>{this.state.listing.listing_user}</NavLink> | <NavLink to='/sectors/Artists'>{this.state.listing.listing_sector}</NavLink> | ${this.state.listing.listing_price} per {this.state.listing.listing_price_type} {this.state.listing.listing_price_currency}
                            </div>
                            
                            <span>{this.state.listing.listing_created_date} {this.state.listing.listing_renewed_date ? <span>(Renewed on {this.state.listing.listing_renewed_date})</span> : ''}</span>
                        </div>

                        <hr/>

                        <div className='row'>
                            <div className={this.props.user.user && this.state.listing && this.props.user.user.username !== this.state.listing.listing_user ? 'col-8' : 'col-12'}>
                                <div className='rounded'>
                                    {this.state.listing.listing_detail}
                                </div>
                            </div>

                            <div className='col-4'>
                                {inquire}
                            </div>
                        </div>

                        <div className='service-footer'>
                            <hr/>
                            {this.state.listingSaved ? <FontAwesomeIcon icon={faHeart} size='sm' style={{cursor: 'pointer'}} color='#ffc107' onClick={() => this.unsave(this.state.listing.saved_id)} /> : <FontAwesomeIcon icon={faHeart} size='sm' style={{cursor: 'pointer'}} onClick={() => this.saveListing()} />} <FontAwesomeIcon icon={faExclamationTriangle} size='sm' style={{cursor: 'pointer'}} />
                        </div>
                    </div>
                </section>
            )
        }
    }
}

export default withRouter(connect()(ListingDetails));