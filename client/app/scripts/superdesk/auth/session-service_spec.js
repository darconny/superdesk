(function() {
    'use strict';

    var SESSION = {
        token: 'abcd',
        _links: {
            self: {href: 'delete_session_url'}
        }
    };

    describe('session service', function() {

        beforeEach(function() {
            localStorage.clear();
            module('superdesk.services.storage');
            module('superdesk.session');
        });

        it('has identity and token property', inject(function (session) {
            expect(session.token).toBe(null);
            expect(session.identity).toBe(null);
        }));

        it('can be started', inject(function (session, $q) {
            session.start(SESSION, {name: 'user'});
            expect(session.token).toBe(SESSION.token);
            expect(session.identity.name).toBe('user');
        }));

        it('can be set expired', inject(function (session, $rootScope) {
            spyOn($rootScope, '$broadcast');
            session.start(SESSION, {name: 'foo'});
            expect($rootScope.$broadcast).toHaveBeenCalledWith('login');
            session.expire();
            expect(session.token).toBe(null);
            expect(session.identity.name).toBe('foo');
            expect($rootScope.$broadcast).toHaveBeenCalledWith('logout');
        }));

        it('can resolve identity on start', inject(function (session, $rootScope) {
            var identity;

            session.getIdentity().then(function (_identity) {
                identity = _identity;
            });

            session.getIdentity().then(function (i2) {
                expect(identity).toBe(i2);
            });

            session.start(SESSION, {name: 'foo'});

            $rootScope.$apply();
            expect(identity.name).toBe('foo');
        }));

        it('can store state for future requests', inject(function (session, $rootScope) {
            session.start(SESSION, {name: 'bar'});

            var nextInjector = angular.injector(['superdesk.session', 'superdesk.services.storage', 'ng']);
            var nextSession = nextInjector.get('session');
            nextInjector.get('$rootScope').$digest();
            $rootScope.$digest();

            expect(nextSession.token).toBe(SESSION.token);
            expect(nextSession.identity.name).toBe('bar');

            nextSession.expire();
            $rootScope.$digest();

            expect(session.token).toBe(null);
            expect(session.identity.name).toBe('bar');
        }));

        it('can set test user with given id', inject(function (session) {
            session.testUser('1234id');

            expect(session.token).toBe(1);
            expect(session.identity._id).toBe('1234id');
            expect(session.sessionId).toBe('s1234id');
        }));

        it('can filter blacklisted fields from indentity', inject(function(session) {
            session.start(SESSION, {
                name: 'foo',
                session_preferences: ['session'],
                user_preferences: ['user'],
                workspace: ['workspace'],
                allowed_actions: ['actions']
            });
            expect(session.identity.name).not.toBeUndefined();
            expect(session.identity.session_preferences).toBeUndefined();
            expect(session.identity.user_preferences).toBeUndefined();
            expect(session.identity.workspace).toBeUndefined();
            expect(session.identity.allowed_actions).toBeUndefined();
        }));

        it('can clear session', inject(function (session) {
            session.start(SESSION, {name: 'bar'});
            session.clear();
            expect(session.token).toBe(null);
            expect(session.identity).toBe(null);
        }));

        it('can persist session delete href', inject(function (session) {
            session.start(SESSION, {name: 'bar'});
            expect(session.getSessionHref()).toBe(SESSION._links.self.href);
        }));

        it('can update identity', inject(function (session, $rootScope) {
            session.start(SESSION, {name: 'bar'});
            session.updateIdentity({name: 'baz'});
            expect(session.identity.name).toBe('baz');

            var nextInjector = angular.injector(['superdesk.session', 'superdesk.services.storage', 'ng']);
            var nextSession = nextInjector.get('session');
            nextInjector.get('$rootScope').$digest();

            $rootScope.$apply();
            expect(nextSession.identity.name).toBe('baz');
        }));

        it('can return identity after session start', inject(function(session, $rootScope) {
            session.start(SESSION, {name: 'bar'});
            $rootScope.$digest();

            var success = jasmine.createSpy('success');
            session.getIdentity().then(success);

            $rootScope.$digest();
            expect(success).toHaveBeenCalled();
        }));

        it('should not resolve identity after expiry', inject(function(session, $rootScope) {
            session.start(SESSION, {name: 'bar'});
            $rootScope.$digest();

            session.expire();
            $rootScope.$digest();

            var success = jasmine.createSpy('success');
            session.getIdentity().then(success);

            $rootScope.$digest();
            expect(success).not.toHaveBeenCalled();
        }));
    });
})();
