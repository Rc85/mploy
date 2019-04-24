import React, { Component } from 'react';
import { Route, withRouter, Switch, NavLink, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { GetSession, GetUserNotificationAndMessageCount, GetSectors } from './actions/FetchActions';
import { RemoveAlert } from './actions/AlertActions';
import * as Pages from './components/pages';
import * as Admin from './components/admin';
import BrowseMenu from './components/includes/site/BrowseMenu';
import Confirmation from './components/utils/Confirmation';
import Alert from './components/utils/Alert';
import Prompt from './components/utils/Prompt';
import Warning from './components/utils/Warning';
import Footer from './components/includes/site/Footer';
import ReviewHireWorld from './components/includes/page/ReviewHireWorld';
import { StripeProvider, Elements } from 'react-stripe-elements';
import CheckoutConfirmation from './components/utils/CheckoutConfirmation';
import fetch from 'axios';
import { LogError } from './components/utils/LogError';
import { IsMobile, IsTyping } from './actions/ConfigActions';
import { ToggleMenu } from './actions/MenuActions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch } from '@fortawesome/pro-solid-svg-icons';
import GlobalLoading from './components/utils/GlobalLoading';
import SelectionModal from './components/utils/SelectionModal';

class App extends Component {
	constructor(props) {
		super(props);

		this.state = {
			mainMenu: false,
			announcements: [],
			announcementIds: []
		}
	}

	/* shouldComponentUpdate(nextProps, nextState) {
		if (this.props.user.user && !nextProps.user.user) {
			return true;
		}

		return true;
	} */
	
	componentDidUpdate(prevProps, prevState) {
		if (this.props.location.key !== prevProps.location.key) {
			window.scrollTo(0, 0);
			this.props.dispatch(GetUserNotificationAndMessageCount());
			this.props.dispatch(IsTyping(false));

			fetch.post('/api/get/announcements')
			.then(resp => {
				if (resp.data.status === 'success') {
					let ids = [];
					let localIds = JSON.parse(localStorage.getItem('dismissed'));

					for (let a of resp.data.announcements) {
						if (!localIds) {
							ids.push(a.announcement_id);
						} else if (localIds && localIds.indexOf(a.announcement_id) < 0) {
							ids.push(a.announcement_id);
						}
					}

					this.setState({announcements: resp.data.announcements, announcementIds: ids});
				}
			})
			.catch(err => LogError(err, '/api/get/announcements'));
		}
	}
		
	componentDidMount() {
		this.props.dispatch(GetSectors());
		this.props.dispatch(GetSession());
		this.props.dispatch(GetUserNotificationAndMessageCount());

		window.addEventListener('resize', () => {
			if (window.innerWidth > 1366) {
				this.props.dispatch(IsMobile(false));
			} else {
				this.props.dispatch(IsMobile(true));
			}
		});

		if (window.innerWidth > 1366) {
			this.props.dispatch(IsMobile(false));
		} else {
			this.props.dispatch(IsMobile(true));
		}

		fetch.post('/api/get/announcements')
		.then(resp => {
			if (resp.data.status === 'success') {
				let ids = [];
				let localIds = JSON.parse(localStorage.getItem('dismissed'));

				for (let a of resp.data.announcements) {
					if (!localIds) {
						ids.push(a.announcement_id);
					} else if (localIds && localIds.indexOf(a.announcement_id) < 0) {
						ids.push(a.announcement_id);
					}
				}

				this.setState({announcements: resp.data.announcements, announcementIds: ids});
			}
		})
		.catch(err => LogError(err, '/api/get/announcements'));
	}
	
	dismissAlert(id) {
		let ids = [...this.state.announcementIds];

		ids.splice(ids.indexOf(id), 1);

		let localIds = JSON.parse(localStorage.getItem('dismissed'));

		if (!localIds) {
			localIds = [];
		}

		localIds.push(id);

		localStorage.setItem('dismissed', JSON.stringify(localIds));

		fetch.post('/api/user/dismiss/announcement', {id: id})
		.catch(err => LogError(err, '/api/user/dismiss/announcement'));

		this.setState({announcementIds: ids});
	}
	
	toggleMenu(e) {
		if (e.target.className === 'browse-menu-item' || e.target.id === 'browse-menu') {
			return;
		} else {
			this.props.dispatch(ToggleMenu(false, '1'));
		}
	}

	render() {
		let confirmation, sectors, alerts, prompt, warning, login, loading;

		if (this.props.confirmation.status === true) {
			confirmation = <Confirmation message={this.props.confirmation.message} note={this.props.confirmation.note} />;

			if (this.props.confirmation.obj.type === 'checkout') {
				confirmation = <CheckoutConfirmation info={this.props.confirmation.obj} />;
			}
		}

		if (this.props.sectors) {
			sectors = this.props.sectors.map((sector, i) => {
				return <Route key={i} path={`/sectors/${sector.sector.toLowerCase()}`} render={() => <Pages.Sectors name={sector.sector} />} />;
			});
		}

		if (this.props.alerts.length > 0) {
			alerts = this.props.alerts.map((alert, i) => {
				return <Alert key={i} status={alert.status} message={alert.message} unmount={() => {
					this.props.alerts.splice(0, 1);
					this.props.dispatch(RemoveAlert(this.props.alerts))
				}} />
			});
		} else if (this.props.alerts.length === 0) {
			alerts = [];
		}

		if (this.props.prompt.text) {
			prompt = <Prompt text={this.props.prompt.text} data={this.props.prompt.data} value={this.props.prompt.value} />;
		}

		if (this.props.warning.message) {
			warning = <Warning message={this.props.warning.message} />;
		}

		if (this.props.loading.show) {
			loading = <GlobalLoading text={this.props.loading.text} />;
		}

		let selection;

		if (this.props.selection.text) {
			selection = <SelectionModal selections={this.props.selection.selections} text={this.props.selection.text} />
		}

		return (
			<React.Fragment>
				<div className='col-container' onClick={(e) => this.toggleMenu(e)}>
					{warning}
					{prompt}
					{confirmation}
					{loading}
					{selection}
	
					<Switch>
						<Route exact path='/' render={() => <Pages.Dashboard user={this.props.user}><Pages.Main user={this.props.user} sectors={this.props.sectors} /></Pages.Dashboard>} />
						<Route exact path='/register' render={() => <Pages.Dashboard user={this.props.user}><Pages.Register user={this.props.user} /></Pages.Dashboard>} />
	
						<Route exact path='/dashboard' render={() => <Pages.Dashboard user={this.props.user}><Pages.EditUser user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/friends' render={() => <Pages.Dashboard user={this.props.user}><Pages.FriendsList user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/blocked-users' render={() => <Pages.Dashboard user={this.props.user}><Pages.BlockedUsers user={this.props.user} /></Pages.Dashboard>} />

						<Route exact path='/dashboard/post/job' render={() => <Pages.Dashboard user={this.props.user}><Pages.PostJob user={this.props.user} sectors={this.props.sectors} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/saved/jobs' render={() => <Pages.Dashboard user={this.props.user}><Pages.SavedPosts user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/posted/jobs' render={() => <Pages.Dashboard user={this.props.user}><Pages.PostedJobs user={this.props.user} sectors={this.props.sectors} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/applied/jobs' render={() => <Pages.Dashboard user={this.props.user}><Pages.AppliedJobs user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/posted/job/details/:id' render={() => <Pages.Dashboard user={this.props.user}><Pages.EditPostedJob user={this.props.user} sectors={this.props.sectors} /></Pages.Dashboard>} />

						<Route exact path='/dashboard/profile' render={() => <Pages.Dashboard user={this.props.user}><Pages.Profile user={this.props.user} sectors={this.props.sectors} /></Pages.Dashboard>} />
	
						<Route exact path='/dashboard/messages' render={() => <Pages.Dashboard user={this.props.user}><Pages.Conversations user={this.props.user} /></Pages.Dashboard>} />

						<Route exact path='/dashboard/jobs' render={() => <Pages.Dashboard user={this.props.user}><Pages.JobSummary user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/jobs/:stage(opened|active|complete|abandoned)' render={() => <Pages.Dashboard user={this.props.user}><Pages.Jobs user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/job/details/:stage(opened)/:id' render={() => <Pages.Dashboard user={this.props.user}><Pages.OpenJobDetails user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/job/details/:stage(active|complete|abandoned)/:id' render={() => <Pages.Dashboard user={this.props.user}><Pages.ActiveJobDetails user={this.props.user} /></Pages.Dashboard>} />
	
						<Route exact path='/dashboard/settings/account' render={() => <Pages.Dashboard user={this.props.user}><Pages.AccountSettings user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/dashboard/settings/payment' render={() => <Pages.Dashboard user={this.props.user}><StripeProvider apiKey={process.env.REACT_ENV === 'production' ? 'pk_live_wJ7nxOazDSHu9czRrGjUqpep' : 'pk_test_KgwS8DEnH46HAFvrCaoXPY6R'}><Elements><Pages.PaymentSettings user={this.props.user} /></Elements></StripeProvider></Pages.Dashboard>} />
						<Route exact path='/dashboard/connect' render={() => <Pages.Dashboard user={this.props.user}><StripeProvider apiKey={process.env.REACT_ENV === 'production' ? 'pk_live_wJ7nxOazDSHu9czRrGjUqpep' : 'pk_test_KgwS8DEnH46HAFvrCaoXPY6R'}><Elements><Pages.Connect user={this.props.user} /></Elements></StripeProvider></Pages.Dashboard>} />
						<Route exact path='/dashboard/settings/connected' render={() => <Pages.Dashboard user={this.props.user}><StripeProvider apiKey={process.env.REACT_ENV === 'production' ? 'pk_live_wJ7nxOazDSHu9czRrGjUqpep' : 'pk_test_KgwS8DEnH46HAFvrCaoXPY6R'}><Elements><Pages.ConnectedSettings user={this.props.user} /></Elements></StripeProvider></Pages.Dashboard>} />
						
						<Route exact path='/dashboard/subscription' render={() => <Pages.Dashboard user={this.props.user}><Pages.SubscriptionSettings user={this.props.user} /></Pages.Dashboard>} />
	
						<Route exact path='/user/:username' render={() => <Pages.Dashboard user={this.props.user}><Pages.ViewUser user={this.props.user} /></Pages.Dashboard>} />
						<Route exact path='/job/:id' render={() => <Pages.Dashboard user={this.props.user}><Pages.ViewPostedJob user={this.props.user} /></Pages.Dashboard>} />
		
						<Route exact path='/sectors/:type/:sector' render={() => <Pages.Dashboard user={this.props.user}><Pages.Sectors user={this.props.user} /></Pages.Dashboard>} />
	
						<Route exact path='/payment/success' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response code={200} header={'Thank You!'}>
							<React.Fragment><div className='mb-3'>We really appreciate your business and hope you will enjoy our service.</div><div><NavLink to='/dashboard/profile'>Start listing now</NavLink></div></React.Fragment>
						</Pages.Response></Pages.Dashboard>} />

						<Route exact path='/connected/job/accepted' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response code={200} header={'Job Accepted!'}>
							<React.Fragment><div className='mb-3'>The job has been moved to the <NavLink to='/dashboard/jobs/active'>active</NavLink> tab.</div></React.Fragment>
						</Pages.Response></Pages.Dashboard>} />

						<Route exact path='/registration/success' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response code={200} header={'Registration Success!'}>
							<React.Fragment><div className='mb-3'>An confirmation email has been sent. Please click the link provided to activate your account</div><NavLink to='/'>Back to main page</NavLink></React.Fragment>
						</Pages.Response></Pages.Dashboard>} />

						<Route exact path='/subscription/cancelled' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response code={200} header={'Unsubscribed!'}>
							<React.Fragment><div className='mb-3'>We hate to see you go. Please take a moment and give rate our service.</div><div className='d-flex-center-center'><ReviewHireWorld /></div></React.Fragment>
						</Pages.Response></Pages.Dashboard>} />

						<Route exact path='/account/created' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response code={200} header={'Account Created! But...'}>
							<React.Fragment><div className='mb-3'>Your Connected account was successfully created and connected to our platform; however, it will be under review and may not be verified yet.</div><div>Please check the settings in your <NavLink to='/dashboard/settings/connected'>Connected Settings</NavLink> for your account status.</div></React.Fragment>
						</Pages.Response></Pages.Dashboard>} />

						<Route exact path='/connected/account/closed' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response code={200} header={'Account Closed!'}></Pages.Response></Pages.Dashboard>} />

						<Route exact path='/connected/job/closed' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response code={200} header={'Job Closed!'}><div>The job is now closed</div></Pages.Response></Pages.Dashboard>} />

						<Route exact path='/resend' render={() => <Pages.Dashboard user={this.props.user}><Pages.ResendConfirmation /></Pages.Dashboard>} />

						<Route exact path='/confirmation-sent' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response code={200} header={'Confirmation Email Sent!'}><div>Please activate your account by clicking on the link in the email</div></Pages.Response></Pages.Dashboard>} />

						<Route exact path='/activate-account/:key' render={() => <Pages.Dashboard user={this.props.user}><Pages.ActivateAccount /></Pages.Dashboard>} />

						<Route exact path='/forgot-password' render={() => <Pages.Dashboard user={this.props.user}><Pages.ForgotPassword /></Pages.Dashboard>} />

						<Route exact path='/faq' render={() => <Pages.Dashboard user={this.props.user}><Pages.Faq /></Pages.Dashboard>} />
						<Route exact path='/tos' render={() => <Pages.Dashboard user={this.props.user}><Pages.TermsOfService /></Pages.Dashboard>} />
						<Route exact path='/privacy' render={() => <Pages.Dashboard user={this.props.user}><Pages.PrivacyPolicy /></Pages.Dashboard>} />
						<Route exact path='/about' render={() => <Pages.Dashboard user={this.props.user}><Pages.About /></Pages.Dashboard>} />

						<Route exact path='/admin-panel' render={() => <Admin.Admin><Admin.AdminOverview user={this.props.user} /></Admin.Admin>} />
						<Route exact path='/admin-panel/sectors' render={() => <Admin.Admin><Admin.AdminSectors user={this.props.user} sectors={this.props.sectors} /></Admin.Admin>} />
						<Route exact path='/admin-panel/users' render={() => <Admin.Admin><Admin.AdminUsers user={this.props.user} /></Admin.Admin>} />
						<Route exact path='/admin-panel/listings' render={() => <Admin.Admin><Admin.AdminListings user={this.props.user} sectors={this.props.sectors} /></Admin.Admin>} />
						<Route exact path='/admin-panel/reports' render={() => <Admin.Admin><Admin.AdminReports user={this.props.user} /></Admin.Admin>} />
						<Route exact path='/admin-panel/config' render={() => <Admin.Admin><Admin.AdminConfig user={this.props.user} /></Admin.Admin>} />
	
						<Route exact path='/error/:type/:code?' render={() => <Pages.Dashboard user={this.props.user}><Pages.Response /></Pages.Dashboard>} />
	
						<Route render={() => <Redirect to='/error/app/404' />} />
					</Switch>
	
					<div className='alert-container'>{alerts}</div>
				</div>

				<Footer />
			</React.Fragment>
		);
	}
}

const mapStateToProps = (state) => {
	return {
		user: state.Login,
		confirmation: state.Confirmation,
		sectors: state.Sectors.sectors,
		alerts: state.Alert.alerts,
		prompt: state.Prompt,
		warning: state.Warning,
		menu: state.Menu,
		loading: state.Loading,
		selection: state.Selection
	}
}

export default withRouter(connect(mapStateToProps)(App));
