import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userData = searchParams.get('user');

    if (token && userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        
        // Format user data consistently with AuthContext
        const formattedUserData = {
          _id: parsedUserData.id || parsedUserData._id,
          name: parsedUserData.name,
          email: parsedUserData.email,
          role: parsedUserData.role,
          isPremium: parsedUserData.isPremium === undefined ? false : parsedUserData.isPremium,
          profileImage: parsedUserData.profileImage || ''
        };
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(formattedUserData));
        setUser(formattedUserData);
        setToken(token);
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Error processing Google callback:', error);
        navigate('/login');
      }
    } else {
      console.error('Missing token or user data in callback');
      navigate('/login');
    }
  }, [searchParams, navigate, setUser, setToken]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default GoogleCallback; 