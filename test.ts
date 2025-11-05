import nodemailer from "nodemailer";

const auths = [{
  user: "picturesdrivedump10@gmail.com",
  pass: "dpapccfnkeikadkm"
}, {
    user: "schedulerascbislig@gmail.com",
    pass: "sboffswwrexhrlqr",
}];

const chosen = auths[Math.floor(Math.random() * auths.length)];

const constant = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  ...chosen, // inject user + pass here
};

const transporter = nodemailer.createTransport({
  host: constant.host,
  port: constant.port,
  secure: constant.secure,
  auth: {
    user: constant.user,
    pass: constant.pass,
  },
});


export default transporter;

