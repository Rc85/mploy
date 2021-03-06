import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import UserRating from './UserRating';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign } from '@fortawesome/pro-solid-svg-icons';
import moment from 'moment';
import UserProfilePic from '../page/UserProfilePic';
import Username from './Username';

const ListingRow = props => {
    let price;

    if (props.listing.listing_price_type === 'To Be Discussed') {
        price = <div className='listing-row-detail-child'><FontAwesomeIcon icon={faDollarSign} className='mr-1' /> {props.listing.listing_price_type}</div>;
    } else {
        if (props.listing.listing_price !== '0') {
            price = <div className='listing-row-detail-child'><FontAwesomeIcon icon={faDollarSign} className='mr-1' /> {props.listing.listing_price} / {props.listing.listing_price_type} {props.listing.listing_price_currency}</div>;
        }
    }

    return(
        <div className='listing-row mb-3'>
            <div className='listing-row-profile-pic'><UserProfilePic url={props.listing.avatar_url} square /></div>

            <div className='listing-row-wrapper'>
                <div className='listing-row-main'>
                    <NavLink to={`/user/${props.listing.listing_user}`}>
                        <div className='listing-row-title' title={props.listing.listing_title}>   
                            <span>{props.listing.listing_title}</span>
                        </div>
        
                        <div className='listing-row-rating'>
                            <UserRating rating={props.listing.rating} /> <span>({props.listing.review_count ? props.listing.review_count : 0})</span>
                        </div>
                    </NavLink>
                </div>
    
                <div className='listing-row-detail'>
                    <div className='listing-row-detail-child'>
                        <Username color='highlight' username={props.listing.listing_user} /> ({props.listing.user_title})
                        {props.listing.link_work_acct_status === 'Approved' ? <div className='linked-status mini-badge mini-badge-success ml-1'>Linked</div> : ''}
                    </div>
    
                    <div className='listing-row-detail-child'>
                        {moment(props.listing.listing_created_date).format('MMM DD YYYY')}
                    </div>
    
                    {price}
    
                    <div className='listing-row-detail-child'>
                        <strong>{props.listing.job_complete}</strong> {parseInt(props.listing.job_complete) === 1 ? 'Job' : 'Jobs'} completee
                    </div>
                </div>
            </div>
        </div>
    )
}

ListingRow.propTypes = {
    listing: PropTypes.object.isRequired
};

export default ListingRow;