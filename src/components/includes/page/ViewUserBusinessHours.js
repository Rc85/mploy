import React from 'react';
import TitledContainer from '../../utils/TitledContainer';

const ViewUserStats = props => {
    let time = [];

    for (let day in props.hours) {
        time.push(
            <div key={day} className='d-flex-between-center mb-1'>
                <div className='w-25'>{day.charAt(0).toUpperCase() + day.substring(1)}</div>
                <div>{props.hours[day]}</div>
            </div>
        )
    }

    return(
        <TitledContainer title='Business Hours' mini shadow>
            {time}
        </TitledContainer>
    )
}

ViewUserStats.propTypes = {
    
};

export default ViewUserStats;