/**
 * DOCU: What deleting an account will actually do, in the words the admin reads
 * before confirming.
 *
 * Both delete confirmations use it - the one raised from the users table's kebab
 * menu and the one raised from the drawer - because they are the same decision
 * with the same consequences, and two copies of this sentence would drift the
 * first time one of them was reworded.
 *
 * The task count is what makes the two cases different. An account with tasks has
 * to say how many are about to be destroyed with it, because that is the part of
 * the decision the admin cannot undo and the part they may not have thought
 * about. An account with none has nothing to lose there, and "and all 0 of its
 * tasks" is a sentence about nothing: it reads like a bug, and it spends the
 * reader's attention on a number instead of on the fact that the account itself
 * is about to go. So the count is mentioned only when there is something to
 * count, and is left out entirely when there is not.
 *
 * The warning is the same either way, because deleting the account cannot be
 * undone whether or not tasks go with it.
 *
 * @param {object} props
 * @param {object} props.user - the account being deleted, carrying its taskCounts
 */
const DeleteUserWarning = ({ user }) => {
    /* `?? 0` rather than `|| 0`, so the branch below is about the count being
     * genuinely zero rather than merely absent - an account whose counts have not
     * loaded yet reads as zero here, which is the same sentence anyway. */
    const total = user?.taskCounts?.total ?? 0;

    return (
        <>
            This removes the account permanently
            {total > 0 && (
                <>
                    {" "}
                    and all <span className="font-extrabold text-ink">{total}</span> of its tasks
                </>
            )}
            . It cannot be undone.
        </>
    );
};

export default DeleteUserWarning;