import React, { useState } from 'react';
import { User } from '../types';
import { Lock, UserCheck, Shield, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const PREDEFINED_USERS = [
  {
    id: 'DINESH D',
    username: 'DINESH D',
    name: 'DINESH D',
    password: '730535',
    role: 'Member 1',
    color: 'from-blue-600 to-indigo-600',
    bgColor: 'bg-blue-50 border-blue-200 text-blue-900',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  {
    id: 'DAYANA',
    username: 'DAYANA',
    name: 'DAYANA',
    password: '12345',
    role: 'Member 2',
    color: 'from-purple-600 to-pink-600',
    bgColor: 'bg-purple-50 border-purple-200 text-purple-900',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
  }
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [selectedUsername, setSelectedUsername] = useState('DINESH D');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectUser = (user: typeof PREDEFINED_USERS[0]) => {
    setSelectedUsername(user.username);
    setPasswordInput('');
    setErrorMessage(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = selectedUsername.trim().toUpperCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser) {
      setErrorMessage('Please select or enter a valid member username.');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    // Match against predefined accounts
    const match = PREDEFINED_USERS.find(
      (u) => u.username.toUpperCase() === cleanUser || u.id.toUpperCase() === cleanUser
    );

    if (match) {
      if (cleanPass === match.password) {
        onLoginSuccess({
          id: match.id,
          username: match.username,
          name: match.name
        });
      } else {
        setErrorMessage(`Incorrect password for ${match.username}. Please verify your password.`);
      }
    } else {
      // Allow custom user if entered credentials match general pattern or error
      setErrorMessage(`User "${selectedUsername}" not found. Please choose DINESH D or DAYANA.`);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-xl relative overflow-hidden">
        {/* Decorative subtle top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        {/* Header section */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 border border-blue-200 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight uppercase">
            Member Authentication
          </h2>
          <p className="text-xs text-gray-500 font-sans max-w-xs mx-auto">
            Select your member profile and enter your password to log in.
          </p>
        </div>

        {/* Quick User Selection Cards */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
            Select Member Profile:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PREDEFINED_USERS.map((user) => {
              const isSelected = selectedUsername.toUpperCase() === user.username.toUpperCase();
              return (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `${user.bgColor} ring-2 ring-blue-500 ring-offset-1 shadow-sm`
                      : 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${user.badgeColor}`}>
                      {user.role}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                  <p className="font-bold text-sm text-gray-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Password required</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Username
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <UserCheck className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="font-semibold">{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Login to Private Workspace
          </button>
        </form>

        {/* Privacy Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-500 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>All saved syllabi, question papers, and CBT exam scores are encrypted & filtered strictly by member account.</span>
        </div>
      </div>
    </div>
  );
}
