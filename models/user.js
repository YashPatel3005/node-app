const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


mongoose.connect("mongodb://mongo:27017/hotel",{useNewUrlParser:true,useUnifiedTopology:true,useCreateIndex:true})
  .then(()=>console.log("Connection Successfull...."))
  .catch((err)=>console.log(err))

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        lowercase:true,
        required:true,
        unique:true
    },
    username:{
        type:String,
        required:true,
        unique:true,
        maxlength:5
    },
    password:{
        type:String,
        required:true,
        minlength:8
    },
    tokens:[{
        token:{
            type:String,
            required:true
        }
    }]
})

userSchema.pre('save', async function(next){
    try {
        const salt = await bcrypt.genSalt(10)
        const hashedpassword = await bcrypt.hash(this.password,salt)
        this.password = hashedpassword
        next()
    } catch (error) {
        next(error)
    }
})

userSchema.methods.comparePassword = async function(password){
    const isMatch = await bcrypt.compare(password,this.password)
    if(!isMatch){
        throw new Error('wrong password')
    }
    return this;
}

userSchema.methods.generateAuthToken = async function(){
    const user = this
    const token = jwt.sign({_id:user._id.toString()},'secretkey')
    user.tokens = user.tokens.concat({token})
    //await user.save()
    return token;
}


//we dont need below code because we use lodash package
// userSchema.methods.toJSON = function(){
//     const user = this;
//     const userObject = user.toObject()
//     delete userObject.password
//     delete userObject.tokens
//     return userObject
// }

const User = new mongoose.model("User",userSchema)

module.exports = User

