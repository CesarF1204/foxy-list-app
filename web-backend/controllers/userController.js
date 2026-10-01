/**
 *
 * Retrieves the profile of the currently authenticated user.
 *
 * The authenticated user is provided by the authentication middleware
 * through `req.user`. If the user is not found, a 404 response is returned.
 * On success, the user's basic profile information is returned.
 *
 */
export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "Retrieved user successfully.",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};
