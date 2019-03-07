import React, { Component } from 'react';
import fetch from 'axios';
import { CardNumberElement, CardExpiryElement, CardCVCElement, injectStripe } from 'react-stripe-elements';
import { LogError } from '../../utils/LogError';
import SubmitButton from '../../utils/SubmitButton';
import { Alert } from '../../../actions/AlertActions';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { ShowConfirmation, ResetConfirmation } from '../../../actions/ConfirmationActions';
import Loading from '../../utils/Loading';
import { GetSession } from '../../../actions/FetchActions';
import AddressInput from './AddressInput';
import Recaptcha from 'react-recaptcha';
import InputWrapper from '../../utils/InputWrapper';
import { IsTyping } from '../../../actions/ConfigActions';

let onloadCallback = function() {
    console.log('Recaptcha ready!');
}

let recaptchaInstance;

class Checkout extends Component {
    constructor(props) {
        super(props);

        // live plan id plan_EFVAGdrFIrpHx5
        // test plan id plan_EAIyF94Yhy1BLB
        this.state = {
            type: 'checkout',
            status: 'Loading',
            plan: '',
            name: '',
            defaultAddress: this.props.user.user_address && this.props.user.user_city && this.props.user.user_region && this.props.user.user_country && this.props.user.user_city_code ? true : false,
            saveAddress: false,
            havePayments: false,
            usePayment: ''
        }
        
        this.submit = this.submit.bind(this);
    }
    
    componentWillReceiveProps(nextProps) {
        if (nextProps.confirm.data) {
            if (nextProps.confirm.data.action === 'submit payment' && nextProps.confirm.option) {
                this.submit();

                this.props.dispatch(ResetConfirmation());
            }
        }
    }

    componentDidMount() {
        fetch.post('/api/get/user/payments')
        .then(resp => {
            if (resp.data.status === 'success') {
                let havePayments = false;
                let usePayment = 'New';

                if (resp.data.payments.length > 0) {
                    havePayments = true;
                    usePayment = false;
                }

                this.setState({status: '', payments: resp.data.payments, havePayments: havePayments, usePayment: usePayment});
            }
        })
        .catch(err => LogError(err, '/api/get/user/payments'));
    }
    
    useDefaultAddress() {
        if (this.props.user.user_address && this.props.user.user_city && this.props.user.user_region && this.props.user.user_country && this.props.user.user_city_code) {
            this.setState({defaultAddress: !this.state.defaultAddress, address_line1: '', address_city: '', address_state: '', address_country: '', address_zip: '', saveAddress: false});
        } else {
            this.props.dispatch(Alert('error', 'No address to use'));
        }
    }
    
    async submit() {
        this.setState({status: 'Sending'});

        let data = { ...this.state };
        let token;
        
        if (!this.state.havePayments) {
            token = await this.props.stripe.createToken({
                name: this.state.name ? this.state.name : `${this.props.user.user_firstname} ${this.props.user.user_lastname}`,
                address_line1: this.state.defaultAddress ? this.props.user.user_address : this.state.address_line1,
                address_city: this.state.defaultAddress ? this.props.user.user_city : this.state.address_city,
                address_state: this.state.defaultAddress ? this.props.user.user_region : this.state.address_state,
                address_zip: this.state.defaultAddress ? this.props.user.user_city_code : this.state.address_zip,
                address_country: this.state.defaultAddress ? this.props.user.user_country : this.state.address_country
            });

            data = { ...data, ...token };
        } else if (this.state.havePayments && this.state.usePayment && this.state.usePayment !== 'New') {
            token = {};
            token['id'] = this.state.usePayment;

            data['token'] = token;
        }
        
        fetch.post('/api/user/subscription/add', data)
        .then(resp => {
            if (resp.data.status === 'success') {
                this.setState({status: 'Success'});
                this.props.dispatch(GetSession());
            } else if (resp.data.status === 'error') {
                this.setState({status: ''});
                this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
                recaptchaInstance.reset();
            }
        })
        .catch(err => {
            LogError(err, '/api/user/payment/submit');
            recaptchaInstance.reset();
            this.setState({status: ''});
        });
    }

    set(key, val) {
        let obj = {};
        obj[key] = val;

        this.setState(obj);
    }

    verify(response) {
        this.setState({verified: response});
    }

    render() {
        let addressInput, status, choosePaymentMethod, newPayment;

        if (this.state.status === 'Success') {
            return <Redirect to='/payment/success' />;
        } else if (this.state.status === 'Sending') {
            status = <Loading size='5x' />;
        }

        if (!this.state.defaultAddress) {
            addressInput = <AddressInput info={this.state} saveable={true} set={(key, val) => this.set(key, val)} />;
        }

        if (this.state.havePayments) {
            choosePaymentMethod = <div className='setting-child'>
                <InputWrapper label='Payment Method' required>
                    <select name='payment-method' id='choose-payment-method' onChange={(e) => this.setState({usePayment: e.target.value})}>
                        <option value=''>Select a payment method</option>
                        {this.state.payments.map((payment, i) => {
                            return <option key={i} value={payment.id}>({payment.brand}) **** **** **** {payment.last4}</option>
                        })}
                        <option value='New'>New payment method...</option>
                    </select>
                </InputWrapper>
            </div>; 
            
        }

        if (this.state.status === 'Loading') {
            newPayment = <div className='position-relative'><Loading size='5x' /></div>;
        } else if (!this.state.havePayments || this.state.usePayment === 'New') {
            newPayment = <React.Fragment>
                <div className='setting-child payment-icons'>
                    <img src='/images/powered_by_stripe.png' className='payment-icon mr-1' />
                    <img src='/images/payment_methods.png' className='payment-icon' />
                </div>

                <div className='setting-child mb-3'>
                    <InputWrapper label='Name on Card'><input type='text' name='fullname' id='fullname' onChange={(e) => this.setState({name: e.target.value})} autoComplete='ccname' onFocus={() => this.props.dispatch(IsTyping(true))} onBlur={() => this.props.dispatch(IsTyping(false))} /></InputWrapper>

                    <label htmlFor='use-default-address'><input type='checkbox' name='use-default-address' id='use-default-address' checked={this.state.defaultAddress} onChange={() => this.useDefaultAddress()} /> Use address registered with this account</label>
                </div>

                <div className='setting-field-container mb-3'>
                    <div className='setting-child'>
                        <InputWrapper label='Credit Card Number' required><CardNumberElement className='w-100' onFocus={() => this.props.dispatch(IsTyping(true))} onBlur={() => this.props.dispatch(IsTyping(false))} /></InputWrapper>
                    </div>
                </div>

                <div className='setting-field-container mb-3'>
                    <div className='setting-child'>
                        <InputWrapper label='Expiry Date' required><CardExpiryElement className='w-100' onFocus={() => this.props.dispatch(IsTyping(true))} onBlur={() => this.props.dispatch(IsTyping(false))} /></InputWrapper>
                    </div>

                    <div className='setting-child'>
                        <InputWrapper label='CVC' required><CardCVCElement className='w-100' onFocus={() => this.props.dispatch(IsTyping(true))} onBlur={() => this.props.dispatch(IsTyping(false))} /></InputWrapper>
                    </div>
                </div>
            </React.Fragment>;
        }

        // live plan id plan_EFVAGdrFIrpHx5
        // test plan id plan_EAIyF94Yhy1BLB
        return (
            <div className='checkout mt-3'>
                {status}
                <div className='setting-field-container mb-3'>
                    <div className='setting-child'>
                        <InputWrapper label='Choose Plan' required>
                            <select name='plan' id='choose-plan' onChange={(e) => this.setState({plan: e.target.value})}>
                                <option value=''>Select a plan</option>
                                <option value='30 Day Listing'>30 Day Listing - $8</option>
                                {!this.props.user.is_subscribed ? <option value={process.env.REACT_ENV === 'production' ? 'plan_EVTJiZUT4rVkCT' : 'plan_EVUbtmca9pryxy'}>Recurring Listing - $8/month</option> : ''}
                            </select>
                        </InputWrapper>
                    </div>
                    
                    {choosePaymentMethod}
                </div>

                {newPayment}

                {addressInput}

                <div className='text-right mb-3'>Note: If you are subscribing to recurring listing, this will become your default payment</div>

                <div className='checkout-buttons'>
                    <Recaptcha sitekey='6Ld784QUAAAAAISqu_99k8_Qk7bHs2ud4cD7EBeI' render='explicit' onloadCallback={onloadCallback} verifyCallback={(val) => this.verify(val)} ref={(el) => recaptchaInstance = el} />
    
                    <SubmitButton type='button' loading={this.state.status === 'Sending'} onClick={() => this.props.dispatch(ShowConfirmation(this.state.plan === '30 Day Listing' ? 'The specified payment method will be charged immediately. Do you want to proceed?' : `Are you sure you want to subscribe to this plan?`, this.state.plan !== '30 Day Listing' ? `If you have remaining days from a previous purchase, your subscription will begin when your previous purchase ends` : '', {action: 'submit payment'}))} />
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        confirm: state.Confirmation
    }
}

export default connect(mapStateToProps)(injectStripe(Checkout));