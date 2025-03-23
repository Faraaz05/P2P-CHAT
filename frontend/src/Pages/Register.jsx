import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../utils/appStore';

function Register() {
    const navigate = useNavigate(); // Correctly define useNavigate
    const { registerUser } = useAuthStore();
    const nameRef = useRef(null);
    const usernameRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const cpasswordRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await registerUser(
                nameRef.current.value,
                usernameRef.current.value,
                emailRef.current.value,
                passwordRef.current.value,
                cpasswordRef.current.value
            );
            navigate('/login'); // Navigate after successful registration
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="w-screen h-screen bg-bg-image flex flex-col items-center">
            <div className="auth-containter w-[40%] h-[70%] flex flex-col items-center justify-evenly bg-slate-950/70 rounded-lg mt-24 text-white backdrop-blur-sm">
                <h1 className="text-2xl font-bold">Register</h1>
                <form className="w-full flex flex-col items-center gap-3" onSubmit={handleSubmit}>
                    <input
                        ref={nameRef}
                        className="w-[80%] p-2 rounded-md bg-gray-800 text-white"
                        placeholder="Name"
                        required
                    />
                    <input
                        ref={usernameRef}
                        className="w-[80%] p-2 rounded-md bg-gray-800 text-white"
                        placeholder="Username"
                        required
                    />
                    <input
                        ref={emailRef}
                        className="w-[80%] p-2 rounded-md bg-gray-800 text-white"
                        type="email"
                        placeholder="Email"
                        required
                    />
                    <input
                        ref={passwordRef}
                        className="w-[80%] p-2 rounded-md bg-gray-800 text-white"
                        type="password"
                        placeholder="Password"
                        required
                    />
                    <input
                        ref={cpasswordRef}
                        className="w-[80%] p-2 rounded-md bg-gray-800 text-white"
                        type="password"
                        placeholder="Confirm Password"
                        required
                    />
                    <button
                        type="submit"
                        className="w-[80%] p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Register
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Register;