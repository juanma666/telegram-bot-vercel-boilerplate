import { Telegraf, Context, Scenes, session, MiddlewareFn } from 'telegraf';
import { about } from './commands';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { Context as TelegrafContext } from 'telegraf';

require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const bot = new Telegraf(BOT_TOKEN);

// Definir estados
enum UserState {
  START,
  ASKED_PAYMENT,
  SELECTED_PAYMENT_METHOD,
  COLLECTED_INFO,
  PAYMENT_VERIFICATION
}

interface MyWizardSession extends Scenes.WizardSessionData {
  userState: UserState;
}



interface MyContext extends TelegrafContext {
  scene: Scenes.SceneContextScene<MyContext, MyWizardSession>;
  wizard: Scenes.WizardContextWizard<MyContext>;
}


// Crear escena para manejar el flujo de conversación
const paymentWizard = new Scenes.WizardScene<MyContext>(
  'payment-wizard',
  async (ctx) => {
    await ctx.reply('Hola! Bienvenido al bot de Erexit 3D. Ya has realizado el pago para entrar a nuestra comunidad? Si/No');
    (ctx.wizard.state as MyWizardSession).userState = UserState.ASKED_PAYMENT;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Manejar respuesta del pago
    // Asegúrate de que tienes un mensaje de texto antes de intentar acceder a 'text'
    if (ctx.message && 'text' in ctx.message) {
      const userResponse = ctx.message.text.toLowerCase();
      if ('text' in ctx.message) {
        const userResponse = ctx.message?.text?.toLowerCase();
        if (userResponse === 'si') {
          await ctx.reply('Perfecto, a través de qué medio has hecho el pago? Paypal/MercadoPago/Patreon');
          (ctx.wizard.state as MyWizardSession).userState = UserState.SELECTED_PAYMENT_METHOD; // Cambio realizado aquí
        } else {
          await ctx.reply('Ok! Elige el método con el cual quieres hacer el pago: Paypal/Mercado Pago');
          (ctx.wizard.state as MyWizardSession).userState = UserState.SELECTED_PAYMENT_METHOD; // Cambio realizado aquí
        }
        return ctx.wizard.next();
      }
      else {
        await ctx.reply('No entendí tu respuesta. ¿Puedes decirme si ya realizaste el pago? Responde con "Si" o "No".');
      }
    } else {
      // Manejar la situación cuando 'text' no está disponible
      await ctx.reply('No pude entender el mensaje. ¿Podrías intentarlo de nuevo?');
    }
  },
  async (ctx) => {
    // Recoger datos del usuario
    await ctx.reply('Perfecto, ahora te voy a pedir tus datos. Ingresa tu nombre completo por favor');
    (ctx.wizard.state as MyWizardSession).userState = UserState.COLLECTED_INFO;
    return ctx.wizard.next();
  },
  async (ctx: MyContext) => {
    // Solicitar correo electrónico
    await ctx.reply('Excelente, ahora tu dirección de mail');
    (ctx.wizard.state as MyWizardSession).userState = UserState.COLLECTED_INFO;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Enlace de pago y confirmación
    await ctx.reply('Ahora por favor realiza el pago a través del siguiente enlace>');
    // Aquí deberías insertar el enlace de pago
    await ctx.reply('Ingresa "ok" si ya realizaste el pago');
    (ctx.wizard.state as MyWizardSession).userState = UserState.PAYMENT_VERIFICATION;
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Verificación final y enlace al grupo
    // Aquí deberías implementar la lógica de verificación del pago
    await ctx.reply('Excelente! ya estás suscrito. Ingresá al grupo de telegram con este link:-------');
    // Finalizar la escena
    return ctx.scene.leave();
  }
);

if (process.env.ENVIRONMENT !== 'production') {
  development(bot);
}


bot.use(session());
const stage = new Scenes.Stage<MyContext>([paymentWizard], { default: 'payment-wizard' });
bot.use(stage.middleware() as MiddlewareFn<Context>);

bot.command('about', about());
bot.command('start', (ctx) => {
  (ctx as unknown as MyContext).scene.enter('payment-wizard');
});

if (process.env.ENVIRONMENT !== 'production') {
  development(bot);
}

export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

process.env.ENVIRONMENT !== 'production' && development(bot);