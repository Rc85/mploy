import React from 'react';
import Enzyme, { shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { MemoryRouter } from 'react-router';
import { reducers } from '../src/reducers';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import Dashboard from '../src/components/pages/Dashboard';
import EditUser from '../src/components/pages/EditUser';
import puppeteer from 'puppeteer';
import toJson from 'enzyme-to-json';

const store = createStore(reducers, applyMiddleware(thunk));
const user = {user: true, status: 'success'}

Enzyme.configure({adapter: new Adapter()});

describe('Edit user page', () => {
    test('snapshot', async() => {
        const wrapper = shallow(
            <Provider store={store}>
                <MemoryRouter initialEntries={[{pathname: '/dashboard/edit', key: 'response'}]}>
                    <Dashboard user={user}><EditUser user={user} /></Dashboard>
                </MemoryRouter>
            </Provider>
        );
        expect(toJson(wrapper)).toMatchSnapshot();
    });
});