import {
    req,
    check,
    checkStatus,
    uniqueEmail,
    clearCookie,
    createAndSignIn,
    state,
    VALID_PASSWORD,
} from './helpers.js';

/** Tests registration, sign in, sign out and session validation. */
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

    /** One mailbox is one account, whatever the case. */
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

    /**
     * Whitespace is refused at registration too, rather than trimmed into a password nobody
     * typed.
     */
    for (const [label, password] of [
        ['a leading space', ' secret123'],
        ['a trailing space', 'secret123 '],
        ['an internal space', 'secret 123'],
    ]) {
        await checkStatus(
            `register with a password carrying ${label} -> 400`,
            'POST',
            '/api/users/register',
            { firstName: 'Ada', lastName: 'L', email: uniqueEmail('spaced'), password },
            400,
            { auth: false }
        );
    }

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

    /** A signup form must not be able to grant itself a role. */
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

    /** The same wording for both, so the endpoint cannot enumerate accounts. */
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

export { run, selfService };

/** Tests password recovery and the unknown route fallback. */
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

    /**
     * Whitespace is refused rather than trimmed, on the reset path like every other one:
     * trimming would store a different secret from the one typed.
     */
    for (const [label, password] of [
        ['a leading space', ' newsecret1'],
        ['a trailing space', 'newsecret1 '],
        ['an internal space', 'new secret1'],
    ]) {
        await checkStatus(
            `reset with a password carrying ${label} -> 400`,
            'PUT',
            '/api/users/reset_password',
            { email: target, password },
            400,
            { auth: false }
        );
    }

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

    /**
     * The password already in force is refused here too. The reset link does not carry the
     * current password, so this can only be caught server-side, by comparing against the stored
     * hash.
     */
    const reused = await checkStatus(
        'reset to the password that is already in force -> 400',
        'PUT',
        '/api/users/reset_password',
        { email: target, password: 'newsecret1' },
        400,
        { auth: false }
    );
    check(
        'the refusal explains that it must differ',
        String(reused.data?.message).toLowerCase().includes('different'),
        true
    );
    check('the refusal repeats neither password', JSON.stringify(reused.data).includes('newsecret1'), false);
    await checkStatus(
        'the password in force still works after the refusal',
        'POST',
        '/api/users/sign_in',
        { email: target, password: 'newsecret1' },
        200,
        { auth: false }
    );

    console.log('\n--- UNKNOWN ROUTES ---');
    await checkStatus('an unknown route -> 404', 'GET', '/api/nope', undefined, 404, { auth: false });
};

/**
 * The self-service profile routes, the ones the View Profile drawer's Edit name and email and
 * Set new password buttons call. A plain user is a legitimate caller, so the interesting checks
 * are the limits: neither route takes an id, and neither can carry a role or status change in
 * its body.
 */
const selfService = async () => {
    console.log('\n--- SELF-SERVICE PROFILE ---');

    const plain = await createAndSignIn('self', 'selfjar');
    const { jar, id } = plain;
    const fresh = uniqueEmail('self');

    await checkStatus(
        'edit your own profile with no session -> 401',
        'PATCH',
        '/api/users/profile',
        { firstName: 'No', lastName: 'Session', email: fresh },
        401,
        { auth: false }
    );

    await checkStatus(
        'set your own password with no session -> 401',
        'PUT',
        '/api/users/password',
        { password: 'newsecret1' },
        401,
        { auth: false }
    );

    const renamed = await checkStatus(
        'edit your own profile -> 200',
        'PATCH',
        '/api/users/profile',
        { firstName: 'Renamed', lastName: 'Person', email: fresh },
        200,
        { jar }
    );
    check('the edit returns the new name', renamed.data?.user?.firstName, 'Renamed');
    check('the edit returns the new email', renamed.data?.user?.email, fresh);
    check('the edit never returns a password', renamed.data?.user?.password, undefined);
    check('the edit does not change the role', renamed.data?.user?.role, 'user');

    /**
     * The session must now report the change, or the navbar would keep showing the old name
     * until a reload.
     */
    const reread = await checkStatus(
        'the session reports the new name',
        'GET',
        '/api/auth/validate_token',
        undefined,
        200,
        { jar }
    );
    check('the session email follows the edit', reread.data?.user?.email, fresh);

    /** The body carries no id at all, so there is nothing to point elsewhere. */
    const withId = await checkStatus(
        'an edit carrying somebody else\'s id -> 200',
        'PATCH',
        '/api/users/profile',
        { _id: '0123456789abcdef01234567', userId: '0123456789abcdef01234567', firstName: 'Renamed', lastName: 'Person', email: fresh },
        200,
        { jar }
    );
    check('the foreign id is ignored, the caller is still edited', withId.data?.user?.email, fresh);
    check('the caller is still themselves', withId.data?.user?._id, id);

    /** Owning the account is not the same as being allowed to promote it. */
    const escalate = await checkStatus(
        'edit your own profile asking for the admin role -> 400',
        'PATCH',
        '/api/users/profile',
        { firstName: 'Sneaky', lastName: 'Person', email: uniqueEmail('sneaky'), role: 'admin' },
        400,
        { jar }
    );
    check(
        'the refusal names the field that was not allowed',
        String(escalate.data?.message).toLowerCase().includes('role'),
        true
    );

    await checkStatus(
        'edit your own profile asking for a status -> 400',
        'PATCH',
        '/api/users/profile',
        { firstName: 'Sneaky', lastName: 'Person', email: uniqueEmail('sneaky2'), status: 'blocked' },
        400,
        { jar }
    );

    /**
     * A second account, so the collision is with somebody else's address. The caller's own old
     * address was freed by the rename above, and reusing it would test the "same account"
     * branch rather than the conflict.
     */
    const other = await createAndSignIn('other', 'otherjar');

    await checkStatus(
        'edit your own profile onto an existing email -> 409',
        'PATCH',
        '/api/users/profile',
        { firstName: 'Taken', lastName: 'Address', email: other.email },
        409,
        { jar }
    );

    await checkStatus(
        'edit your own profile with a short password field is not a route -> 404',
        'PUT',
        '/api/users/profile',
        undefined,
        404,
        { jar }
    );

    /** Re-read after the refusals: none of them may have changed anything. */
    const unchanged = await checkStatus(
        'the role is still plain after every attempt',
        'GET',
        '/api/auth/validate_token',
        undefined,
        200,
        { jar }
    );
    check('still a plain user', unchanged.data?.user?.role, 'user');
    check('still the edited name', unchanged.data?.user?.firstName, 'Renamed');

    console.log('\n--- SELF-SERVICE PASSWORD ---');

    await checkStatus(
        'set your own password with a short value -> 400',
        'PUT',
        '/api/users/password',
        { password: 'abc' },
        400,
        { jar }
    );

    /** Whitespace is refused, never trimmed, on the self-service path too. */
    for (const [label, password] of [
        ['a leading space', ' newsecret1'],
        ['a trailing space', 'newsecret1 '],
        ['an internal space', 'new secret1'],
    ]) {
        await checkStatus(
            `set your own password with ${label} -> 400`,
            'PUT',
            '/api/users/password',
            { password },
            400,
            { jar }
        );
    }

    /**
     * The password in force is refused. The request carries no current password - it does not
     * have to, and should not: the server compares against the stored hash, so the old secret
     * never crosses the wire.
     */
    const reused = await checkStatus(
        'set your own password to the one already in force -> 400',
        'PUT',
        '/api/users/password',
        { password: VALID_PASSWORD },
        400,
        { jar }
    );
    check(
        'the refusal explains that it must differ',
        String(reused.data?.message).toLowerCase().includes('different'),
        true
    );
    check('the refusal repeats neither password', JSON.stringify(reused.data).includes(VALID_PASSWORD), false);
    await checkStatus(
        'the password in force still signs in after the refusal',
        'POST',
        '/api/users/sign_in',
        { email: fresh, password: VALID_PASSWORD },
        200,
        { auth: false }
    );

    const changed = await checkStatus(
        'set your own password -> 200',
        'PUT',
        '/api/users/password',
        { password: 'newsecret1' },
        200,
        { jar }
    );
    check('the password endpoint returns no user at all', changed.data?.user, undefined);
    check('the password endpoint returns a message', typeof changed.data?.message, 'string');

    await checkStatus(
        'the old password no longer signs in',
        'POST',
        '/api/users/sign_in',
        { email: fresh, password: VALID_PASSWORD },
        401,
        { auth: false }
    );
    await checkStatus(
        'the new password signs in',
        'POST',
        '/api/users/sign_in',
        { email: fresh, password: 'newsecret1' },
        200,
        { auth: false }
    );

    /**
     * A plain user still cannot reach the administrative writes, and the role one specifically:
     * this is the call the hidden Change role button would have made.
     */
    await checkStatus(
        'a plain user changing their own role -> 403',
        'PUT',
        `/api/admin/users/${id}/role`,
        { role: 'admin' },
        403,
        { jar }
    );

    return { email: fresh };
};

/** Allow the file to be run on its own, not only through tests/run.js */
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
