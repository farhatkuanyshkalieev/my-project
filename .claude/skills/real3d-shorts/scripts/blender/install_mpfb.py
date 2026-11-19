# Установка MPFB (генератор людей MakeHuman, CC0) и пакета ассетов MakeHuman.
#   blender -b --python install_mpfb.py
# Ставит расширение mpfb с extensions.blender.org, качает makehuman_system_assets_cc0.zip в ~/.real3d-shorts и подключает.
import bpy, os, sys, urllib.request
from pathlib import Path

HOME = Path(os.environ.get("REAL3D_HOME", Path.home() / ".real3d-shorts"))
HOME.mkdir(parents=True, exist_ok=True)
PACK_URL = "http://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip"
PACK = HOME / "makehuman_system_assets_cc0.zip"

prefs = bpy.context.preferences
if hasattr(prefs.system, "use_online_access"):
    prefs.system.use_online_access = True
repo = next((i for i, r in enumerate(prefs.extensions.repos) if "extensions.blender.org" in (r.remote_url or "")), None)
if repo is None:
    print("❌ Репозиторий extensions.blender.org не найден в настройках Blender")
    sys.exit(1)
MOD = "bl_ext.blender_org.mpfb"
if MOD not in prefs.addons:
    import addon_utils
    if not any(m.__name__ == MOD for m in addon_utils.modules()):
        bpy.ops.extensions.repo_sync(repo_index=repo)
        bpy.ops.extensions.package_install(repo_index=repo, pkg_id="mpfb")
    bpy.ops.preferences.addon_enable(module=MOD)
# ВАЖНО: без сохранения настроек фоновый Blender (-b) не увидит MPFB
bpy.ops.wm.save_userpref()
print("✅ MPFB установлен и включён")

try:
    from bl_ext.blender_org.mpfb.services.locationservice import LocationService
    skins = Path(LocationService.get_user_data()) / "skins"
    if skins.exists() and any(skins.iterdir()):
        print("✅ Пакет MakeHuman уже подключён")
    else:
        if not PACK.exists() or PACK.stat().st_size < 100_000_000:
            print("⬇ Скачиваю пакет MakeHuman (~280 МБ)…")
            urllib.request.urlretrieve(PACK_URL, PACK)
        bpy.ops.mpfb.load_pack(filepath=str(PACK))
        print("✅ Пакет MakeHuman подключён")
except Exception as e:
    print("❌ Не удалось подключить пакет:", e, "— перезапусти Blender и запусти скрипт ещё раз")
    sys.exit(1)
print("MPFB_OK")
