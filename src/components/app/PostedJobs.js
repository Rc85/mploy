import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TitledContainer from '../utils/TitledContainer';
import { faFolderOpen, faCircleNotch, faUserCircle, faThList, faCalendarAlt } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LogError } from '../utils/LogError';
import { connect } from 'react-redux';
import fetch from 'axios';
import PostedJobRow from '../includes/page/PostedJobRow';
import Loading from '../utils/Loading';
import Row from '../includes/page/Row';
import { NavLink } from 'react-router-dom';
import Username from '../includes/page/Username';
import SlideToggle from '../utils/SlideToggle';
import moment from 'moment';
import { Alert } from '../../actions/AlertActions';

class PostedJobs extends Component {
    constructor(props) {
        super(props);
        
        this.state = {
            status: 'Loading',
            jobs: []
        }
    }
    
    componentDidMount() {
        fetch.post('/api/get/posted/jobs')
        .then(resp => {
            console.log(resp);
            if (resp.data.status === 'success') {
                this.setState({status: '', jobs: resp.data.jobs});
            } else if (resp.data.status === 'error') {
                this.setState({status: 'error'});
            }
        })
        .catch(err => {
            LogError(err, '/api/get/posted/jobs');
            this.setState({status: 'error'});
        });
    }

    toggleJob(id, status, index) {
        this.setState({status: `Toggling ${id}`});

        let newStatus;

        if (status === 'Active') {
            newStatus = 'Inactive';
        } else if (status === 'Inactive') {
            newStatus = 'Active';
        }

        fetch.post('/api/posted/job/toggle', {id: id, status: newStatus, user: this.props.user.user.username})
        .then(resp => {
            if (resp.data.status === 'success') {
                let jobs = [...this.state.jobs];
                jobs[index].job_post_status = newStatus;

                this.setState({status: '', jobs: jobs});
            } else if (resp.data.status === 'error') {
                this.setState({status: ''});
            }

            this.props.dispatch(Alert(resp.data.status, resp.data.statusMessage));
        })
        .catch(err => {
            LogError(err, '/api/posted/job/toggle');
            this.setState({status: ''});
            this.props.dispatch(Alert('error', 'An error occurred'));
        });
    }
    
    render() {
        if (this.props.user.status === 'error') {
            return <Redirect to='/error/app/401' />;
        } else if (this.props.user.status === 'not logged in') {
            return <Redirect to='/main' />;
        }
        
        if (this.state.status === 'Loading') {
            status = <Loading size='5x' />;
        } else if (this.state.status === 'error') {
            return <Redirect to='/error/app/500' />;
        }
        
        if (this.props.user.user) {
            let status;

            return (
                <section id='posted-jobs' className='main-panel'>
                    {status}

                    <TitledContainer title='Posted Jobs' bgColor='violet' icon={<FontAwesomeIcon icon={faFolderOpen} />} shadow>
                        {this.state.jobs.map((job, i) => {
                            let local, remote, online;

                            if (job.job_is_local) {
                                local = <span className='mini-badge mini-badge-orange mr-1'>Local</span>;
                            }
                    
                            if (job.job_is_remote) {
                                remote = <span className='mini-badge mini-badge-green mr-1'>Remote</span>;
                            }
                    
                            if (job.job_is_online) {
                                online = <span className='mini-badge mini-badge-purple mr-1'>Online</span>;
                            }

                            return <Row
                            key={job.job_post_id}
                            index={i}
                            length={this.state.jobs.length}
                            title={
                                <React.Fragment>
                                    <span className='mr-2'>{local} {online} {remote}</span>
                                    <NavLink to={`/dashboard/posted/job/details/${job.job_post_id}`}>{job.job_post_title}</NavLink>
                                </React.Fragment>
                            }
                            details={
                                <React.Fragment>
                                    <div className='row-detail'><FontAwesomeIcon icon={faUserCircle} className='text-special mr-1' /> {job.job_post_as_user ? <Username username={job.job_post_user} color='alt-highlight' /> : job.job_post_company}</div>
                                    <div className='row-detail'><FontAwesomeIcon icon={faThList} className='text-special mr-1' /> {job.job_post_sector}</div>
                                    <div className='row-detail'><FontAwesomeIcon icon={faCalendarAlt} className='text-special mr-1' /> {moment(job.job_post_date).format('MM-DD-YYYY')}</div>
                                </React.Fragment>
                            }
                            buttons={<React.Fragment>{this.state.status === `Toggling ${job.job_post_id}` ? <FontAwesomeIcon icon={faCircleNotch} spin className='mr-1' /> : ''}
                            <SlideToggle status={job.job_post_status === 'Active'} onClick={() => this.toggleJob(job.job_post_id, job.job_post_status, i)} /></React.Fragment>}
                            />
                        })}
                    </TitledContainer>
                </section>
            );
        }

        return <Loading size='7x' color='black' />
    }
}

PostedJobs.propTypes = {
    user: PropTypes.object,
    sectors: PropTypes.array
};

export default connect()(PostedJobs);