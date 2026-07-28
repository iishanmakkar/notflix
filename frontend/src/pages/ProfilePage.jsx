import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { User, Camera, Lock, Save, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ProfilePage() {
    const { user, setUser, token, api } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef();

    const [name, setName] = useState(user?.name || '');
    const [profileImage, setProfileImage] = useState(user?.profileImage || '');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(user?.profileImage || '');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState(null);
    const [passwordMessage, setPasswordMessage] = useState(null);

    const getInitials = (name) => {
        if (!name) return "?";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (event) => setPreviewUrl(event.target.result);
        reader.readAsDataURL(file);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileMessage(null);
        setProfileLoading(true);
        try {
            const formData = new FormData();
            if (name.trim() !== user?.name) {
                formData.append('name', name.trim());
            }
            if (selectedFile) {
                formData.append('profileImage', selectedFile);
            }

            if (!name.trim() && !selectedFile) {
                setProfileMessage({ type: 'error', text: 'No changes to save.' });
                setProfileLoading(false);
                return;
            }

            const response = await axios.put(
                `${import.meta.env.VITE_API_URL}/api/auth/update-profile`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            const updatedUser = response.data.user;
            const formattedUser = {
                ...user,
                name: updatedUser.name,
                profileImage: updatedUser.profileImage || user.profileImage,
            };
            localStorage.setItem('user', JSON.stringify(formattedUser));
            setUser(formattedUser);
            setProfileImage(updatedUser.profileImage || '');
            setPreviewUrl(updatedUser.profileImage || '');
            setSelectedFile(null);
            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setProfileMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to update profile',
            });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'All password fields are required.' });
            return;
        }
        if (newPassword.length < 8) {
            setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        setPasswordLoading(true);
        try {
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/auth/change-password`,
                { currentPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPasswordMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to change password',
            });
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-12 max-w-2xl">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-black mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </button>

            <h1 className="font-display text-5xl mb-8">PROFILE.</h1>

            {/* Profile Info / Edit Name & Image */}
            <Card className="mb-8 border-2 border-black">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Profile Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Profile"
                                        className="w-24 h-24 rounded-full border-2 border-black object-cover"
                                    />
                                ) : (
                                    <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-black bg-[#b7c6c2] text-3xl font-bold text-black">
                                        {getInitials(user?.name)}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full border-2 border-white hover:bg-gray-800 transition-colors"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <p className="text-sm text-gray-500">JPEG, PNG, GIF or WebP (max 5MB)</p>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                className="border-2 border-black"
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <Input
                                value={user?.email || ''}
                                disabled
                                className="border-2 border-black bg-gray-100 text-gray-500"
                            />
                        </div>

                        {profileMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                                profileMessage.type === 'success'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                            }`}>
                                {profileMessage.type === 'success'
                                    ? <CheckCircle className="w-4 h-4" />
                                    : <AlertCircle className="w-4 h-4" />
                                }
                                {profileMessage.text}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={profileLoading}
                            className="w-full border-2 border-black bg-black text-white shadow-[3px_3px_0_#000] hover:bg-gray-800"
                        >
                            {profileLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Premium Status */}
            <Card className="border-2 border-black">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Premium Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="font-medium">Subscription Plan</p>
                            <p className="text-sm text-muted-foreground">
                                {user?.isPremium ? 'You have an active Premium subscription' : 'Free plan - Upgrade for premium access'}
                            </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium border-2 border-black ${
                            user?.isPremium
                                ? 'bg-[#b7c6c2] text-black'
                                : 'bg-gray-200 text-gray-600'
                        }`}>
                            {user?.isPremium ? 'Premium' : 'Free'}
                        </div>
                    </div>
                    
                        {user?.isPremium && (
                        <div className="mt-4 space-y-2">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                    ✅ You have access to all premium notes for viewing
                                </p>
                            </div>
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    🔒 Premium notes cannot be downloaded - upgrade required for download
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="border-2 border-black">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Change Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Current Password</label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="border-2 border-black"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">New Password</label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 8 characters)"
                                className="border-2 border-black"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="border-2 border-black"
                            />
                        </div>

                        {passwordMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                                passwordMessage.type === 'success'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                            }`}>
                                {passwordMessage.type === 'success'
                                    ? <CheckCircle className="w-4 h-4" />
                                    : <AlertCircle className="w-4 h-4" />
                                }
                                {passwordMessage.text}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={passwordLoading}
                            className="w-full border-2 border-black bg-black text-white shadow-[3px_3px_0_#000] hover:bg-gray-800"
                        >
                            {passwordLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            ) : (
                                <Lock className="w-4 h-4 mr-2" />
                            )}
                            Change Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}