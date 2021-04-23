const express = require('express')
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = 8000;

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.get('/connections/create-invitation', cors(), (req, res) => {
  // res.send("conn inv");
  axios.post("http://localhost:8021/connections/create-invitation")
            .then(resp => {
              console.log(resp.data);
              res.send(resp.data)
            })
            .catch(error => {
              console.error(error, "Agent may not be connected");
            });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});