var express = require('express');
var router = express.Router();

const User = require('../models/user')

const jwt = require('jsonwebtoken')
var lodash = require('lodash');
const passport = require('passport')
require('../config/passport')(passport)

const auth = require('../middleware/auth');

// const cleanCache  = require('../middleware/emptyCache');





/**
 * @swagger
 *
 * definitions:
 *   NewUser:
 *     type: object
 *     required:
 *       - name
 *       - email
 *       - username
 *       - password
 *     properties:
 *       name :
 *         type: string
 *       email :
 *         type: string
 *       username:
 *         type: string
 *       password:
 *         type: string
 *         format: password
 *   User:
 *     allOf:
 *       - $ref: '#/definitions/NewUser'
 *       - required:
 *         - id
 *       - properties:
 *         id:
 *           type: integer
 *           format: int64
 */


//get data by id
/**
 * @swagger
 * /users:
 *  get:
 *      summary: Get Users Data By Id
 *      tags:
 *            - name: User
 *      description: Get users Data By Id
 *      parameters:
 *         - name: id
 *           description:  id to get by 
 *           in: query
 *           type: string
 *           required: true 
 *      responses:
 *          '200':
 *              description: A Successfull Response
 *          '404':
 *              description: user not exits!!
 */
router.get('/',async (req,res,next)=>{
  try {
    
    //Here we use rediss
    //redis is used for store a value in cache memory so every time-
    //this api call it will not connect with database it will first check data is eexits in cache memory oor not

    //do we have any cached data in redis related to this query
    // const cachedUser = await client.get(req.query.id)

    //if yes,  then respond in the request and return
    // if(cachedUser){
    //   console.log("Serving From Cache");
    //   return res.status(200).json({result:JSON.parse(cachedUser)})
    // }
    //if no, we need to respond to req and update our cache to store the data
    
    const user = await User.findById(req.query.id).cache({ key: req.query.id });

    if(!user){
      return res.status(404).send({message:"user not exits"})
    }
    res.status(200).json({result:user})
    
    // client.set(req.query.id,JSON.stringify(user))
  } catch (error) {
    res.status(400).send(error)
  }
})


//insert data

/**
 * @swagger
 *
 * /users:
 *   post:
 *     summary: User Registration
 *     tags:
 *        - name : User 
 *     description: Creates a user
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: user
 *         description: User object
 *         in:  body
 *         required: true
 *         type: string
 *         schema:
 *           $ref: '#/definitions/NewUser'
 *     responses:
 *       200:
 *         description: users
 *         schema:
 *           $ref: '#/definitions/User'
 */
router.post('/',async (req,res,next)=>{
  const user =  new User(req.body);
  try {
    await user.save()
    let resultUser = lodash.pick(user,['username', 'name', '_id', 'email']) 
    res.status(201).send({resultUser})
  } catch (e) {
    //console.log(JSON.stringify(e));
    
    if(e.name == "MongoError" && e.code == 11000){
        field = Object.keys(e.keyValue)[0]
        // console.log(Object.keys(e.keyValue))
        const response = {
          message : `${field} already exits`,
          field:field
        }
        return res.status(422).json(response) 
    } 
    else if(e.name == "ValidationError")
    {
     return res.status(409).json({message:e.message})
    //console.log("Validation"+e.message)
    }
    else{
     res.status(409).json({ message: "error saving data" });
    }
  }
})

/**
 * @swagger
 *
 * /users/login:
 *   post:
 *     summary: User Login
 *     tags :
 *        - name : User
 *     description: Login user into the system
 *     produces:
 *       - application/json  
 *       - application/xml
 *     parameters:
 *       - name: email
 *         description: Email id to use for login.
 *         in: formData 
 *         required: true
 *         type: string
 *       - name: password
 *         description: User's password.
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: login
 *       400:
 *         description: Invalid username/password supplied
 */

router.post('/login', async (req,res,next)=>{
  try {
    const user = await User.findOne({email: req.body.email});
    const token = await user.generateAuthToken()
    let resultUser;
    if(!user){
      res.status(404).json({message:"You are not registred with this email.....Please Register"})
    }else{
      await user.comparePassword(req.body.password);
      resultUser = lodash.pick(user, ['username', 'name', '_id', 'email']);
      resultUser['token'] = token;
    }  
    res.status(200).send({message:"Login Successfull", user:resultUser})   
  } catch (error) {
    res.status(401).json({message:"Wrong Password"})
  }
})

//login by passport js -- passport js --its is best way to authenticate
// router.post('/login',
//   passport.authenticate('local',{session:false}),
//   function(req,res,next){
//       res.send(req.user)
//   })


//get data by jwtstrategy passport
/**
 * @swagger
 * /users/get:
 *  get:
 *      summary: Get Users Data By Token
 *      tags:
 *            - name: User
 *      description: Get users Data By Token
 *      parameters:
 *           - in: header
 *             name: Authorization
 *             schema:
 *               type: string
 *      responses:
 *          '200':
 *              description: A Successfull Response
 *          '404':
 *              description: user not exits!!
 */

router.get('/get',
  passport.authenticate('jwt',{session:false}),
  function(req,res,next){
    let resultUser = lodash.pick(req.user, ['username', 'name', '_id', 'email']);
      res.send({result:resultUser})
  })



  
//update data by id
/**
 * @swagger
 *
 * /users:
 *   patch:
 *     summary: Update User's data
 *     tags :
 *        - name : User
 *     description: Update User data by id
 *     produces:
 *       - application/json  
 *       - application/xml
 *     parameters:
 *       - name: id
 *         description: id To update 
 *         in: query
 *         required: true
 *         type: string
 *       - name: user
 *         description: User object
 *         in:  body
 *         required: true
 *         type: string
 *         schema:
 *           type: object
 *           properties:  
 *              name: 
 *                type: string
 *           required:
 *              - name     
 *     responses:
 *       200:
 *         description: login
 *       400:
 *         description: Invalid username/password supplied
 */
router.patch('/',async (req,res,next)=>{

  const updates = Object.keys(req.body)
  const allowedUpdates = ['name']
  const isValidOperation = updates.every((update)=>allowedUpdates.includes(update))
  
  if(!isValidOperation){
    return res.status(400).send({error:'Invalid updates!!!'})
  }
 
  try {
    const user = await User.findByIdAndUpdate(req.query.id, req.body)
    if(!user){
      return res.status(404).send({error:'user not found'})
    }
    res.status(200).json({message:'resource updated successfully'})
  } catch (error) {
    res.status(400).send(error)
  }
})


//delete data by id
/**
 * @swagger
 * /users:
 *  delete:
 *      summary: Delete users Data By Id
 *      tags:
 *            - name: User
 *      description: Delete users Data By Id
 *      parameters:
 *         - name: id
 *           description:  id to delete by 
 *           in: query
 *           type: string
 *           required: true 
 *      responses:
 *          '200':
 *              description: A Successfull Response
 */
router.delete('/',async(req,res,next)=>{
  try {
    const user = await User.findByIdAndDelete(req.query.id)
    if(!user){
      return res.status(404).json({error: "Record not exits!!.."})
    }
    res.json({message:"Record deleted Successfully"}).status(200)
  } catch (error) {
    res.status(400).send(error)
  }
})


//to get  data by token
router.get('/', auth,async (req,res,next)=>{
  try {
    //below code is run if auth middleware run and it have tokens
    if(req.user){
      const user = await User.findById(req.user.id)
      if(!user){
        return res.send({message:"user not exits"}).status(404)
      }
      res.status(200).json({result:user})
    }else{
      const user = await User.find()
      res.json({result:user}).status(200)
    }
  } catch (error) {
    res.send(error).status(404)
  }
})



/**
 * @swagger
 * /users/allData:
 *   get:
 *     summary: Returns all Users data
 *     tags : 
 *        - name : User
 *     description: Returns all users
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: users
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/User'
 */
router.get('/allData', async (req,res,next)=>{
  const user = await User.find()
  res.send(user)
})


router.get('/myAccount', auth , async (req,res,next)=>{
  res.send(req.user)
})


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;
