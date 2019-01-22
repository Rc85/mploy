import React from 'react';
import PropTypes from 'prop-types';

const InputGroup = props => {
    return(
        <div id={props.id ? props.id : ''} className={`input-group-container ${props.className ? props.className : ''}`}>
            <label className={`input-group-label ${!props.labelBgColor ? 'bg-highlight' : props.labelBgColor}`}>{props.label}</label>

            <div className={`input-group ${props.style ? props.style : 'row'}`}>{props.children}</div>
        </div>
    )
}

InputGroup.propTypes = {
    id: PropTypes.string,
    labelBgColor: PropTypes.string
};

export default InputGroup;