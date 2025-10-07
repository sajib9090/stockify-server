export const handleCreateCustomerSupplier = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  //   const { name, mobile, type } = req.body;
  try {
    console.log(user);
    res.status(200).send({
      success: true,
      message: "Added successfully",
    });
  } catch (error) {
    next(error);
  }
};
