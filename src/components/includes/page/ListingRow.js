import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import UserRating from './UserRating';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faUserCircle, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import { faCheckCircle, faClock } from '@fortawesome/free-regular-svg-icons';
import moment from 'moment';
import UserProfilePic from '../page/UserProfilePic';

const ListingRow = props => {
    let purpose;

    const selectRow = () => {
        let input = document.getElementById(`listing-${props.listing.saved_id}`);

        props.selected(input.checked);
    }

    if (props.listing.listing_purpose === 'For Hire') {
        purpose = <span className='badge badge-purple'>For Hire</span>
    } else if (props.listing.listing_purpose === 'Hiring') {
        purpose = <span className='badge badge-orange'>Hiring</span>
    }

    return(
        <div className='mb-3'>
            <div className='d-flex-between-start'>
                <div className='w-3'><UserProfilePic url={props.listing.avatar_url} /></div>

                <div className='w-96'>
                    <div className='d-flex-between-start'>
                        {props.editable ? <div className='w-5'><input id={`listing-${props.listing.saved_id}`} className='listing-row-checkbox' type='checkbox' onClick={() => selectRow()} /></div> : ''}
                        <div className='w-90 text-truncate' title={props.listing.listing_title}>{purpose} <NavLink to={`/user/${props.listing.listing_user}`}>{props.listing.listing_title}</NavLink></div>
                        {props.editable ? <div className='w-5 text-right'><button className='btn btn-secondary btn-sm' onClick={() => props.delete()}><FontAwesomeIcon icon={faTrash} /></button></div> : <div className='w-10 text-right'><UserRating rating={props.listing.rating} /></div>}
                    </div>
        
                    <div className='d-flex-between-start'>
                        <div className='w-25 text-truncate'><small><FontAwesomeIcon icon={faUserCircle} className='view-user-icon mr-2' /> {props.listing.listing_user} ({props.listing.user_title})</small></div>
                        <div className='w-25'>{props.editable ? '' : <small><FontAwesomeIcon icon={faDollarSign} className='view-user-icon mr-2' /> ${props.listing.listing_price} / {props.listing.listing_price_type} {props.listing.listing_price_currency} {props.listing.listing_negotiable ? <span className='badge badge-primary'>Negotiable</span> : ''}</small>}</div>
                        <div className='w-25 text-right'>{props.editable ? '' : <small><FontAwesomeIcon icon={faCheckCircle} className='view-user-icon mr-2'/> <strong className='mr-1'>{props.listing.job_complete}</strong> {parseInt(props.listing.job_complete) === 1 ? <span>Job</span> : <span>jobs</span>} completed</small>}</div>
                        <div className='w-25 text-right'>{props.editable ? '' : <small><FontAwesomeIcon icon={faClock} className='view-user-icon mr-2' /> {moment(props.listing.listing_created_date).format('MMM DD YYYY')}</small>}</div>
                    </div>
                </div>
            </div>

            <hr className='theme-medgrey-bg mb-0 mt-0'/>
        </div>
    )
}

ListingRow.propTypes = {
    listing: PropTypes.object.isRequired
};

export default ListingRow;