import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { Layers, Code, Monitor, Share2 } from 'lucide-react';

export default function AuthComponent() {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-16">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Layers size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">SlideForge</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Crea presentaciones<br />interactivas con codigo
          </h2>
          <p className="text-blue-100 text-lg max-w-md">
            HTML, CSS y JavaScript en tus slides. Comparte con tus alumnos al instante.
          </p>
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-4 text-white/80">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Code size={18} />
            </div>
            <div>
              <p className="font-medium text-white text-sm">Editor HTML completo</p>
              <p className="text-sm text-blue-200">Edicion visual y de codigo en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-white/80">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Monitor size={18} />
            </div>
            <div>
              <p className="font-medium text-white text-sm">Modo presentacion</p>
              <p className="text-sm text-blue-200">Pantalla completa con controles de navegacion</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-white/80">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div>
              <p className="font-medium text-white text-sm">Comparte al instante</p>
              <p className="text-sm text-blue-200">Enlaces seguros para alumnos, sin registro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - auth form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Layers size={24} className="text-white" />
            </div>
          </div>
          <div className="lg:block hidden mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido</h1>
            <p className="text-gray-500 text-sm">Inicia sesion o crea una cuenta para continuar</p>
          </div>
          <div className="lg:hidden text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">SlideForge</h1>
            <p className="text-gray-500 text-sm">Presentaciones interactivas con codigo</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#4f46e5',
                      brandAccent: '#4338ca',
                      inputBackground: '#f9fafb',
                      inputBorder: '#e5e7eb',
                      inputBorderFocus: '#4f46e5',
                      inputBorderHover: '#d1d5db',
                    },
                    borderWidths: { buttonBorderWidth: '0px', inputBorderWidth: '1px' },
                    radii: { borderRadiusButton: '10px', inputBorderRadius: '10px' },
                    fontSizes: { baseButtonSize: '14px', baseInputSize: '14px' },
                    space: { inputPadding: '10px 14px', buttonPadding: '10px 14px' },
                  },
                },
              }}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Correo electronico',
                    password_label: 'Contrasena',
                    button_label: 'Iniciar sesion',
                    loading_button_label: 'Iniciando sesion...',
                    social_provider_text: 'Continuar con {{provider}}',
                    link_text: 'Ya tienes una cuenta? Inicia sesion',
                  },
                  sign_up: {
                    email_label: 'Correo electronico',
                    password_label: 'Contrasena',
                    button_label: 'Registrarse',
                    loading_button_label: 'Registrandose...',
                    social_provider_text: 'Continuar con {{provider}}',
                    link_text: 'No tienes una cuenta? Registrate',
                    confirmation_text: 'Revisa tu correo para confirmar tu cuenta',
                  },
                  forgotten_password: {
                    email_label: 'Correo electronico',
                    button_label: 'Enviar instrucciones',
                    loading_button_label: 'Enviando...',
                    link_text: 'Olvidaste tu contrasena?',
                    confirmation_text: 'Revisa tu correo para restablecer tu contrasena',
                  },
                },
              }}
              providers={[]}
              redirectTo={window.location.origin}
            />
          </div>

          <p className="text-center mt-6 text-xs text-gray-400">
            Al registrarte, aceptas nuestros terminos de servicio y politica de privacidad.
          </p>
        </div>
      </div>
    </div>
  );
}
