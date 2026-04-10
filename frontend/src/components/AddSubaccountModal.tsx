'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { X } from 'lucide-react';

const addSubaccountSchema = z.object({
  friendlyName: z.string().min(1, 'Friendly name is required'),
  authType: z.enum(['authToken', 'apiKey'], {
    errorMap: () => ({ message: 'Please select an authentication type' }),
  }),
  accountSid: z.string()
    .transform((val) => val.trim())
    .refine(
      (val) => /^AC[a-zA-Z0-9]{32}$/i.test(val),
      'Must be 34 characters starting with "AC"'
    ),
  twilioSid: z.string().optional().default(''),
  twilioAuthToken: z.string().min(1, 'This field is required'),
}).superRefine((data, ctx) => {
  if (data.authType === 'authToken') {
    // For Auth Token: twilioSid should be same as accountSid
    data.twilioSid = data.accountSid;
    // Validate Auth Token length
    if (data.twilioAuthToken.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Auth Token must be at least 32 characters',
        path: ['twilioAuthToken'],
      });
    }
  } else if (data.authType === 'apiKey') {
    // Validate API Key SID format
    if (!data.twilioSid || !data.twilioSid.startsWith('SK')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API Key SID must start with "SK"',
        path: ['twilioSid'],
      });
    }
    // Validate API Key SID length
    if (data.twilioSid && !/^SK[a-zA-Z0-9]{32}$/i.test(data.twilioSid.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API Key SID must be 34 characters starting with "SK"',
        path: ['twilioSid'],
      });
    }
    // Validate API Key Secret length
    if (data.twilioAuthToken.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API Key Secret must be at least 32 characters',
        path: ['twilioAuthToken'],
      });
    }
  }
});

type AddSubaccountForm = z.infer<typeof addSubaccountSchema>;

interface AddSubaccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubaccountModal({ isOpen, onClose, onSuccess }: AddSubaccountModalProps) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AddSubaccountForm>({
    resolver: zodResolver(addSubaccountSchema),
    defaultValues: {
      authType: 'authToken', // Default to auth token for simplicity
    },
  });

  const authType = watch('authType');

  const onSubmit = async (data: AddSubaccountForm) => {
    setError('');
    setIsLoading(true);

    try {
      // For Auth Token mode, use accountSid as twilioSid
      const payload = {
        ...data,
        twilioSid: data.authType === 'authToken' ? data.accountSid : data.twilioSid,
      };

      await api.post('/api/subaccounts', payload);
      reset();
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add subaccount. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Add Subaccount</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-400 text-red-800 rounded-lg shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="friendlyName" className="block text-sm font-medium text-gray-700 mb-1">
              Friendly Name
            </label>
            <input
              id="friendlyName"
              type="text"
              {...register('friendlyName')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
              placeholder="e.g., Production Account"
            />
            {errors.friendlyName && (
              <p className="mt-1 text-sm text-red-600">{errors.friendlyName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                authType === 'authToken' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  value="authToken"
                  {...register('authType')}
                  className="mr-2"
                />
                <div>
                  <div className="font-medium text-sm">Auth Token</div>
                  <div className="text-xs text-gray-500">Simple setup</div>
                </div>
              </label>
              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                authType === 'apiKey' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  value="apiKey"
                  {...register('authType')}
                  className="mr-2"
                />
                <div>
                  <div className="font-medium text-sm">API Key</div>
                  <div className="text-xs text-gray-500">More secure</div>
                </div>
              </label>
            </div>
            {errors.authType && (
              <p className="mt-1 text-sm text-red-600">{errors.authType.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="accountSid" className="block text-sm font-medium text-gray-700 mb-1">
              Account SID
            </label>
            <input
              id="accountSid"
              type="text"
              {...register('accountSid')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            {errors.accountSid && (
              <p className="mt-1 text-sm text-red-600">{errors.accountSid.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Your Twilio Account SID from the Console dashboard. Starts with "AC".
            </p>
          </div>

          {authType === 'authToken' ? (
            <div>
              <label htmlFor="twilioAuthToken" className="block text-sm font-medium text-gray-700 mb-1">
                Auth Token
              </label>
              <input
                id="twilioAuthToken"
                type="password"
                {...register('twilioAuthToken')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm"
                placeholder="********************************"
              />
              {errors.twilioAuthToken && (
                <p className="mt-1 text-sm text-red-600">{errors.twilioAuthToken.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Auth Token from Twilio Console → Account → General Settings. Will be encrypted and stored securely.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="twilioSid" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key SID
                </label>
                <input
                  id="twilioSid"
                  type="text"
                  {...register('twilioSid')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm"
                  placeholder="SK********************************"
                />
                {errors.twilioSid && (
                  <p className="mt-1 text-sm text-red-600">{errors.twilioSid.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  API Key SID from Twilio Console → Account → API Keys. Starts with "SK".
                </p>
              </div>

              <div>
                <label htmlFor="twilioAuthToken" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key Secret
                </label>
                <input
                  id="twilioAuthToken"
                  type="password"
                  {...register('twilioAuthToken')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm"
                  placeholder="********************************"
                />
                {errors.twilioAuthToken && (
                  <p className="mt-1 text-sm text-red-600">{errors.twilioAuthToken.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  The secret shown once when creating the API Key. Will be encrypted and stored securely.
                </p>
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Adding...' : 'Add Subaccount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
