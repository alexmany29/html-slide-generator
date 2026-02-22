import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';

export default function AuthComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ⚡ SlideForge
            </h1>
            <p className="text-gray-600">
              Crea presentaciones interactivas con HTML, CSS y JavaScript
            </p>
          </div>
          
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button',
                input: 'auth-input',
              },
            }}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  button_label: 'Iniciar sesión',
                  loading_button_label: 'Iniciando sesión...',
                  social_provider_text: 'Continuar con {{provider}}',
                  link_text: '¿Ya tienes una cuenta? Inicia sesión',
                },
                sign_up: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  button_label: 'Registrarse',
                  loading_button_label: 'Registrándose...',
                  social_provider_text: 'Continuar con {{provider}}',
                  link_text: '¿No tienes una cuenta? Regístrate',
                  confirmation_text: 'Revisa tu correo para confirmar tu cuenta',
                },
                forgotten_password: {
                  email_label: 'Correo electrónico',
                  button_label: 'Enviar instrucciones',
                  loading_button_label: 'Enviando...',
                  link_text: '¿Olvidaste tu contraseña?',
                  confirmation_text: 'Revisa tu correo para restablecer tu contraseña',
                },
              },
            }}
            providers={[]}
            redirectTo={window.location.origin}
          />
        </div>
        
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>
            Al registrarte, aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}
