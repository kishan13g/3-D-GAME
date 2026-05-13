from django.urls import path
from . import views

urlpatterns = [
    path('register/',              views.register,            name='register'),
    path('login/',                 views.login,               name='login'),
    path('me/',                    views.me,                  name='me'),
    path('logout/',                views.logout,              name='logout'),
    # Admin
    path('admin/users/',           views.admin_user_list,     name='admin-users'),
    path('admin/users/<int:user_id>/toggle/', views.admin_toggle_user, name='admin-toggle-user'),
    path('admin/users/<int:user_id>/wallet/', views.admin_adjust_wallet, name='admin-wallet'),
    path('admin/transactions/',    views.admin_transactions,  name='admin-transactions'),
]
