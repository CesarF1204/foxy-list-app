import {
    req,
    check,
    checkStatus,
    uniqueEmail,
    clearCookie,
    state,
    VALID_PASSWORD,
} from './helpers.js';

/**
 * DOCU: Tests registration, sign in, sign out and session validation.
 * Last Updated Date: October 1, 2026
 * @function run
 * @returns {Promise<{email: string}>} The account the session was created with
 * @author Cesar
 */
const run = async () => {
    console.log('\n--- REGISTRATION ---');

    const email = uniqueEmail('auth');

    const created = await checkStatus(
        'register -> 201',
        'POST',
        '/api/users/register',
        { firstName: 'Ada', lastName: 'Lovelace', email, password: VALID_PASSWORD },
        201,
        { auth: false }
    );

    check('register returns the user id', typeof created.data?.user?._id, 'string');
    check('register never returns a password', created.data?.user?.password, undefined);
    check('a self-registered account is a plain user', created.data?.user?.role, 'user');
    check('a new account is active', created.data?.user?.status, 'active');

    await checkStatus(
        'register a duplicate email -> 409',
        'POST',
        '/api/users/register',
        { firstName: 'Ada', lastName: 'L', email, password: VALID_PASSWORD },
        409,
        { auth: false }
    );

    /* One mailbox is one account, whatever the case. */
    await checkStatus(
        'register a duplicate email in another case -> 409',
        'POST',
        '/api/users/register',
        { firstName: 'Ada', lastName: 'L', email: email.toUpperCase(), password: VALID_PASSWORD },
        409,
        { auth: false }
    );

    const invalid = await checkStatus(
        'register with an invalid email -> 400',
        'POST',
        '/api/users/register',
        { firstName: 'Ada', lastName: 'Lovelace', email: 'not-an-email', password: VALID_PASSWORD },
        400,
        { auth: false }
    );
    check('validation errors come back as a list', Array.isArray(invalid.data?.message), true);

    await checkStatus(
        'register with a short password -> 400',
        'POST',
        '/api/users/register',
        { firstName: 'Ada', lastName: 'L', email: uniqueEmail('short'), password: 'abc' },
        400,
        { auth: false }
    );

    await checkStatus(
        'register with digits in a name -> 400',
        'POST',
        '/api/users/register',
        { firstName: 'Ada99', lastName: 'L', email: uniqueEmail('digits'), password: VALID_PASSWORD },
        400,
        { auth: false }
    );

    await checkStatus(
        'register with missing fields -> 400',
        'POST',
        '/api/users/register',
        {},
        400,
        { auth: false }
    );

    /* A signup form must not be able to grant itself a role. */
    const escalate = await checkStatus(
        'register asking for the admin role -> 400',
        'POST',
        '/api/users/register',
        {
            firstName: 'Sneaky',
            lastName: 'Person',
            email: uniqueEmail('escalate'),
            password: VALID_PASSWORD,
            role: 'admin',
        },
        400,
        { auth: false }
    );
    check(
        'the refusal names the field that was not allowed',
        String(escalate.data?.message).toLowerCase().includes('role'),
        true
    );

    console.log('\n--- SIGN IN ---');

    await checkStatus(
        'sign in with a wrong password -> 401',
        'POST',
        '/api/users/sign_in',
        { email, password: 'wrong-one' },
        401,
        { auth: false }
    );

    const unknown = await checkStatus(
        'sign in with an unknown email -> 401',
        'POST',
        '/api/users/sign_in',
        { email: uniqueEmail('ghost'), password: VALID_PASSWORD },
        401,
        { auth: false }
    );

    /* The same wording for both, so the endpoint cannot enumerate accounts. */
    const wrongPassword = await req(
        'POST',
        '/api/users/sign_in',
        { email, password: 'wrong-one' },
        { auth: false }
    );
    check(
        'unknown email and wrong password are indistinguishable',
        unknown.data?.message,
        wrongPassword.data?.message
    );

    await checkStatus(
        'sign in with no password -> 400',
        'POST',
        '/api/users/sign_in',
        { email },
        400,
        { auth: false }
    );

    const login = await checkStatus(
        'sign in -> 200',
        'POST',
        '/api/users/sign_in',
        { email, password: VALID_PASSWORD },
        200,
        { jar: 'authuser', auth: false }
    );
    check('sign in never returns a password', login.data?.user?.password, undefined);
    check('sign in returns a token for non-browser clients', typeof login.data?.token, 'string');

    console.log('\n--- SESSION ---');

    const session = await req('GET', '/api/auth/validate_token', undefined, { jar: 'authuser' });
    check('validate token -> 200', session.status, 200);
    check('validate token returns the same user', session.data?.user?._id, login.data?.user?._id);
    check('validate token never returns a password', session.data?.user?.password, undefined);

    await checkStatus(
        'validate token with no cookie -> 401',
        'GET',
        '/api/auth/validate_token',
        undefined,
        401,
        { jar: 'nobody', auth: false }
    );

    await checkStatus(
        'validate token with a garbage cookie -> 401',
        'GET',
        '/api/auth/validate_token',
        undefined,
        401,
        { auth: false, cookie: 'session=not-a-jwt' }
    );

    const logout = await req('POST', '/api/users/logout', undefined, { jar: 'authuser' });
    check('logout -> 200', logout.status, 200);
    await checkStatus(
        'the session is dead after logout',
        'GET',
        '/api/auth/validate_token',
        undefined,
        401,
        { jar: 'authuser' }
    );

    return { email };
};

export { run };

/**
 * DOCU: Tests password recovery and the unknown route fallback.
 * Last Updated Date: October 1, 2026
 * @function recovery
 * @returns {Promise<void>} Resolves once the checks have run
 * @author Cesar
 */
export const recovery = async () => {
    console.log('\n--- PASSWORD RECOVERY ---');

    const target = uniqueEmail('recover');

    await req(
        'POST',
        '/api/users/register',
        { firstName: 'Rec', lastName: 'Over', email: target, password: VALID_PASSWORD },
        { auth: false }
    );

    const forgotKnown = await req(
        'POST',
        '/api/users/forgot_password',
        { email: target },
        { auth: false }
    );
    const forgotUnknown = await req(
        'POST',
        '/api/users/forgot_password',
        { email: uniqueEmail('nobody') },
        { auth: false }
    );

    check('forgot password -> 200', forgotKnown.status, 200);
    check(
        'forgot password does not reveal whether the address exists',
        forgotKnown.data?.message,
        forgotUnknown.data?.message
    );

    await checkStatus(
        'forgot password with no email -> 400',
        'POST',
        '/api/users/forgot_password',
        {},
        400,
        { auth: false }
    );

    await checkStatus(
        'reset password with no email -> 400',
        'PUT',
        '/api/users/reset_password',
        { password: 'newsecret1' },
        400,
        { auth: false }
    );

    const reset = await req(
        'PUT',
        '/api/users/reset_password',
        { email: target, password: 'newsecret1' },
        { auth: false }
    );
    check('reset password -> 200', reset.status, 200);
    check('reset password returns no user at all', reset.data?.user, undefined);

    await checkStatus(
        'the old password no longer works',
        'POST',
        '/api/users/sign_in',
        { email: target, password: VALID_PASSWORD },
        401,
        { auth: false }
    );
    await checkStatus(
        'the new password works',
        'POST',
        '/api/users/sign_in',
        { email: target, password: 'newsecret1' },
        200,
        { auth: false }
    );

    await checkStatus(
        'reset password for an unknown address -> 404',
        'PUT',
        '/api/users/reset_password',
        { email: uniqueEmail('nobody'), password: 'newsecret1' },
        404,
        { auth: false }
    );

    console.log('\n--- UNKNOWN ROUTES ---');
    await checkStatus('an unknown route -> 404', 'GET', '/api/nope', undefined, 404, { auth: false });
};

/* Allow the file to be run on its own, not only through tests/run.js */
if (process.argv[1]?.endsWith('api-auth.test.js')) {
    run()
        .then(recovery)
        .then(() => {
            console.log(
                `\n===== ${state.checks - state.failures}/${state.checks} checks passed, ${state.failures} failed =====`
            );
            process.exit(state.failures ? 1 : 0);
        })
        .catch((error) => {
            console.error('\nTEST RUNNER ERROR:', error.message);
            process.exit(2);
        });
}
