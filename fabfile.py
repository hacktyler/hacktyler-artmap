from fabric.api import *

"""
Base configuration
"""
env.project_name = 'artmap'

"""
Environments
"""
def production():
    """
    Work on production environment
    """
    env.settings = 'production'
    env.s3_bucket = 'media.hacktyler.com'

def staging():
    """
    Work on staging environment
    """
    env.settings = 'staging'
    env.s3_bucket = 'media-beta.hacktyler.com'
    
"""
Commands - deployment
"""
def deploy():
    """
    Deploy the latest version of the site to the server and restart Apache2.
    
    Does not perform the functions of load_new_data().
    """
    require('settings', provided_by=[production, staging])

    deploy_to_s3()

def deploy_to_s3():
    """
    Deploy the latest project site media to S3.
    """
    local(('s3cmd -P --guess-mime-type sync ./assets/ s3://%(s3_bucket)s/%(project_name)s/') % env)

"""
Deaths, destroyers of worlds
"""
def shiva_the_destroyer():
    """
    Remove all directories, databases, etc. associated with the application.
    """
    with settings(warn_only=True):
        run('s3cmd del --recursive s3://%(s3_bucket)s/%(project_name)s' % env)

