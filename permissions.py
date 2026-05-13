from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Allows access only to users with profile.role == 'admin'."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'admin'
        )
