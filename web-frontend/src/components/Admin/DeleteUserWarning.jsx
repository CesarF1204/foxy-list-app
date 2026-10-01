/** What deleting an account will actually do, in the words the admin reads before confirming. */
const DeleteUserWarning = ({ user }) => {
    
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