import { ArrowLeft } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../utils/appStore'

import useFetch from '../hooks/useFetch'

function Settings() {
    const { user } = useAuthStore()
    const [name, setName] = useState(user.name)
    const [username, setUsername] = useState(user.username)
    const [avatar, setAvatar] = useState(user.avatar)
    const [bio, setBio] = useState(user.bio)
    const [prog, setProg] = useState(false)
    const [progresspercent, setProgresspercent] = useState(0)
    const nav = useNavigate()
    const api = useFetch()

    const updateUser = async (name, username, avatar, bio) => {
        try {
            const formData = new FormData(); // Use FormData for file uploads
            formData.append('name', name);
            formData.append('username', username);
            formData.append('bio', bio);
            if (avatar) {
                formData.append('avatar', avatar); // Append the avatar file
            }
    
            // Remove the 'Content-Type' header to let the browser set it automatically
            let { response, data } = await api(`edit/user/${user.user_id}`, 'PUT', formData);
    
            if (response.status === 200) {
                alert('Changes added Successfully! \n Wait a few minutes for the changes to be applied :)');
                setTimeout(() => {
                    nav('/');
                }, 1000);
            } else {
                console.error('Error updating user:', data);
                alert('Failed to save changes. Please try again.');
            }
        } catch (err) {
            console.error('Error updating user:', err);
        }
    };
    
    const handleFileChange = (e) => {
        e.preventDefault();
        const file = e.target?.files[0];
        if (file) {
            setAvatar(file);  // Store the file in state
        }
    };

  return (
    <section className="w-screen h-screen bg-bg-image flex items-center justify-center">
    <div className={`w-full h-full lg:h-[93vh] lg:w-[75vw] flex-col p-5 text-white transition-opacity duration-500 flex bg-gray-950/60 backdrop-blur-lg rounded-xl border border-slate-600`}>
        <div className="p-2 flex gap-2 items-center cursor-pointer" onClick={() => nav('/')}>
            <ArrowLeft size={20} />
            <span>Go back</span>
        </div>
        <div className="py-3 px-10">
            <h1 className='text-4xl font-semibold'>Settings</h1>
        </div>
        <div className='w-[40%] flex flex-col mx-auto px-5 gap-5'>
        <div className="flex flex-col items-center gap-10">
            <div className="flex items-center gap-10">
            <img
    src={avatar?.startsWith('http') ? avatar : `http://127.0.0.1:8000${avatar || '/media/avatars/default_avatar.jpg'}`}
    className="rounded-full w-20"
    alt="User Avatar"
/>
                <div className="flex flex-col gap-2">
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    { prog && <h1 className='font-thin text-xs'>{progresspercent}% uploaded</h1> }
                </div>
            </div>
            </div>
            <div className="flex flex-col gap-1">
                <h1 className='text-lg'>Name</h1>
                <input type="text" className='bg-slate-700/60 text-base border-none outline-none p-2 rounded-md' placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
                <h1 className='text-lg'>Username</h1>
                <input type="text" className='bg-slate-700/60 text-base border-none outline-none p-2 rounded-md' placeholder="Enter your Username" value={`${username}`} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
                <h1 className='text-lg'>About</h1>
                <textarea type="text" className='bg-slate-700/60 resize-none text-base border-none outline-none p-2 rounded-md' placeholder="Enter about yourself" value={bio} onChange={(e) => setBio(e.target.value)}  />
            </div>
            <button className='p-2 bg-blue-800 rounded-md text-md' onClick={() => {
                updateUser(name, username, avatar, bio)
            }}
            >save
            </button>
        </div>
    </div>
  </section>
  )
}

export default Settings
