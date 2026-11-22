(function(){
  'use strict';
  const scriptBase=new URL('../',document.currentScript.src);
  const cfg=window.ZOOTERM_CONFIG||{};
  const configured=cfg.supabaseUrl && cfg.supabasePublishableKey && !cfg.supabasePublishableKey.includes('COLE_AQUI');
  const client=configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}}) : null;
  const $=id=>document.getElementById(id);
  const message=(text,type='')=>{const el=$('status');if(el){el.textContent=text;el.className='status '+type;}};
  const callbackUrl=()=>new URL('auth/callback/',scriptBase).href;
  const homeUrl=()=>new URL('index.html',scriptBase).href;
  const loginUrl=()=>new URL('login.html',scriptBase).href;
  const ensure=()=>{if(!client){message('Configure a chave pública do Supabase em js/config.js antes de testar o cadastro e o login.','error');return false;}return true;};
  const safeError=e=>e?.message||'Não foi possível concluir a operação.';
  document.addEventListener('DOMContentLoaded',async()=>{
    const page=document.body.dataset.page;
    if(page==='cadastro'){
      $('signup-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!ensure())return;const nome=$('nome').value.trim(),email=$('email').value.trim(),password=$('password').value;if(password.length<8){message('Utilize uma senha com pelo menos 8 caracteres.','error');return;}message('Enviando cadastro...');const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:callbackUrl(),data:{nome}}});if(error){message(safeError(error),'error');return;}if(data.session){await client.auth.signOut();}message('Se o cadastro puder ser realizado, você receberá um e-mail de confirmação. Verifique também a caixa de spam.','success');});
    }
    if(page==='login'){
      $('login-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!ensure())return;message('Autenticando...');const {error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){message('Não foi possível entrar. Confira as credenciais e a confirmação do e-mail.','error');return;}location.href=homeUrl()+'#acesso';});
      $('reset-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!ensure())return;const {error}=await client.auth.resetPasswordForEmail($('reset-email').value.trim(),{redirectTo:callbackUrl()});message(error?safeError(error):'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.',error?'error':'success');});
      $('show-reset')?.addEventListener('click',()=>{$('login-form').classList.add('hidden');$('reset-form').classList.remove('hidden');message('');});
      $('show-login')?.addEventListener('click',()=>{$('reset-form').classList.add('hidden');$('login-form').classList.remove('hidden');message('');});
    }
    if(page==='callback'){
      if(!ensure())return;
      const url=new URL(location.href);const code=url.searchParams.get('code');const type=url.searchParams.get('type') || (url.hash.includes('type=recovery') ? 'recovery' : '');
      if(code){const {error}=await client.auth.exchangeCodeForSession(code);if(error){message(safeError(error),'error');return;}}
      const {data:{session},error}=await client.auth.getSession();if(error||!session){message('Não foi possível validar o link. Solicite um novo e-mail de confirmação.','error');return;}
      // O evento PASSWORD_RECOVERY também é tratado abaixo para links de recuperação.
      if(type==='recovery' || url.hash.includes('type=recovery')){$('password-change').classList.remove('hidden');message('Defina sua nova senha.','success');}else{message('E-mail confirmado! Você já pode acessar sua conta.','success');$('go-login').classList.remove('hidden');}
      $('password-form')?.addEventListener('submit',async e=>{e.preventDefault();const pwd=$('new-password').value;if(pwd.length<8){message('A senha deve ter pelo menos 8 caracteres.','error');return;}const {error}=await client.auth.updateUser({password:pwd});if(error){message(safeError(error),'error');return;}await client.auth.signOut();message('Senha atualizada. Faça login novamente.','success');$('password-change').classList.add('hidden');$('go-login').classList.remove('hidden');});
    }
    if(page==='home' && client){
      const {data:{user}}=await client.auth.getUser();const signed=$('signed-in'),guest=$('guest-actions');if(user){signed?.classList.remove('hidden');guest?.classList.add('hidden');const label=$('user-label');if(label)label.textContent=user.user_metadata?.nome||user.email||'Usuário';}else{signed?.classList.add('hidden');guest?.classList.remove('hidden');}
      $('logout')?.addEventListener('click',async()=>{await client.auth.signOut();location.reload();});
    }
  });
})();
