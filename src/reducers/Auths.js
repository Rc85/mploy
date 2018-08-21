const loginInitialState = {
    status: null,
    user: null
}

export const Login = (state = loginInitialState, action) => {
    switch(action.type) {
        case 'LOGIN_USER_BEGIN':
        case 'LOGIN_USER_FAIL':
        case 'LOGIN_USER_ERROR':
            return Object.assign(...state, {status: action.status});
        case 'LOGIN_USER_SUCCESS':
        case 'EDIT_USER_SUCCESS':
        case 'GET_SESSION_SUCCESS':
        case 'EDIT_USER_BEGIN':
        case 'EDIT_USER_FAIL':
        case 'EDIT_USER_ERROR':
            return Object.assign(...state, {status: action.status, user: action.user});
        case 'LOGOUT_USER':
        default: return state;
    }
}

const registerInitialState = {
    status: null
}

export const Register = (state = registerInitialState, action) => {
    switch(action.type) {
        case 'REGISTER_USER_BEGIN':
        case 'REGISTER_USER_FAILED':
            return Object.assign(...state, {status: action.status});
        case 'REGISTER_USER_SUCCESS': return Object.assign(...state, {status: action.status});
        case 'REGISTER_USER_ERROR': return Object.assign(...state, {status: action.status});
        default: return state;
    }
}